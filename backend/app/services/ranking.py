"""
ranking.py — Two-stage ranking engine (PIPELINE_SPEC §3).

Stage 1: Embedding cosine similarity (all candidates vs reference)
Stage 2: Attribute overlay re-rank (jaccard on extracted attributes)
Final:   Popular soft boost → sort → paginate
"""

import logging
import numpy as np
from typing import Optional
from app.config import (
    RANKING_ALPHA, RANKING_BETA, RANKING_TOP_K, RANKING_POPULAR_BOOST,
    CONF_W_SIMILARITY, CONF_W_COMPLETENESS, CONF_W_RELIABILITY, CONF_W_VISUAL,
    VERDICT_GREAT_THRESHOLD, VERDICT_GOOD_THRESHOLD,
    VERDICT_CAUTION_THRESHOLD, VERDICT_CAUTION_MIN_CONF,
)
from app.services.normalizer import (
    field_completeness, get_store_reliability, remove_price_outliers,
)

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Cosine similarity (numpy, in-process, <50ms for 100 vectors)
# ─────────────────────────────────────────────────────────────────────────────
def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b:
        return 0.0
    va, vb = np.array(a), np.array(b)
    denom = np.linalg.norm(va) * np.linalg.norm(vb)
    return float(np.dot(va, vb) / denom) if denom > 0 else 0.0


# ─────────────────────────────────────────────────────────────────────────────
# Attribute jaccard similarity (Stage 2 attribute overlay)
# ─────────────────────────────────────────────────────────────────────────────
def _extract_attrs(listing: dict) -> set[str]:
    """Pull discriminating attributes into a flat token set for Jaccard."""
    tokens = set()
    for field in ("brand", "category", "title"):
        val = listing.get(field, "")
        if val:
            tokens.update(val.lower().split())
    # Add colour/material tokens from title if present
    COLOR_TOKENS = {"black","white","red","blue","green","yellow","pink","beige",
                    "brown","grey","gray","purple","orange","gold","silver","navy"}
    title_words = set((listing.get("title") or "").lower().split())
    tokens.update(title_words & COLOR_TOKENS)
    return tokens


def attribute_similarity(ref: dict, candidate: dict) -> float:
    a = _extract_attrs(ref)
    b = _extract_attrs(candidate)
    if not a or not b:
        return 0.0
    intersection = len(a & b)
    union = len(a | b)
    return intersection / union if union > 0 else 0.0


# ─────────────────────────────────────────────────────────────────────────────
# Confidence score formula (PIPELINE_SPEC + architect review)
# ─────────────────────────────────────────────────────────────────────────────
def compute_confidence(
    listing: dict,
    similarity: float,
    visual_score: float = 0.0,
) -> float:
    completeness = field_completeness(listing)
    reliability  = get_store_reliability(listing.get("storeId", ""))
    visual_norm  = visual_score / 100.0

    score = (
        CONF_W_SIMILARITY   * similarity
        + CONF_W_COMPLETENESS * completeness
        + CONF_W_RELIABILITY  * reliability
        + CONF_W_VISUAL       * visual_norm
    )
    return round(score, 4)


# ─────────────────────────────────────────────────────────────────────────────
# Two-stage ranking
# ─────────────────────────────────────────────────────────────────────────────
def rank_listings(
    listings: list[dict],
    reference: dict,
    reference_embedding: list[float],
    candidate_embeddings: list[list[float]],
    visual_scores: Optional[dict[int, float]] = None,
) -> list[dict]:
    """
    Args:
        listings:              canonical listing dicts (post-dedup)
        reference:             canonical dict of the request reference (for attr overlay)
        reference_embedding:   embedding of the request reference text
        candidate_embeddings:  embeddings in same order as listings
        visual_scores:         {index: 0-100} from image compare (optional)

    Returns:
        listings sorted by finalScore DESC, with scores attached.
    """
    visual_scores = visual_scores or {}

    # Stage 1 — embedding similarity for all candidates
    for i, listing in enumerate(listings):
        emb = candidate_embeddings[i] if i < len(candidate_embeddings) else []
        sim = cosine_similarity(reference_embedding, emb)
        listing["_embSim"] = sim

    # Take top-K for Stage 2 (attribute overlay)
    top_k = sorted(listings, key=lambda x: x.get("_embSim", 0), reverse=True)[:RANKING_TOP_K]

    for i_orig, listing in enumerate(listings):
        is_top_k = listing in top_k
        emb_sim  = listing.get("_embSim", 0)

        if is_top_k:
            attr_sim = attribute_similarity(reference, listing)
        else:
            attr_sim = 0.0  # skip expensive attr extraction for non-top-k

        final_score = RANKING_ALPHA * emb_sim + RANKING_BETA * attr_sim
        visual_sc   = visual_scores.get(i_orig, 0)
        confidence  = compute_confidence(listing, emb_sim, visual_sc)

        # Popular soft boost (applied to sort key only, not the displayed score)
        pop_boost = RANKING_POPULAR_BOOST / 100.0 if listing.get("isPopular") else 0

        listing.update({
            "similarityScore": round(emb_sim * 100),      # 0-100 for API
            "confidenceScore": round(confidence * 100),    # 0-100 for API
            "_finalScore":     final_score + pop_boost,
            "_attrSim":        attr_sim,
        })

    return listings


# ─────────────────────────────────────────────────────────────────────────────
# Sort
# ─────────────────────────────────────────────────────────────────────────────
def sort_listings(listings: list[dict], sort: str = "similarity") -> list[dict]:
    if sort == "price_asc":
        return sorted(listings, key=lambda x: (x.get("price") or float("inf")))
    if sort == "popularity":
        return sorted(listings, key=lambda x: (not x.get("isPopular"), -(x.get("rating") or 0)))
    # Default: similarity (finalScore desc), tie-break by rawId for determinism
    return sorted(listings, key=lambda x: (-x.get("_finalScore", 0), x.get("rawId", "")))


# ─────────────────────────────────────────────────────────────────────────────
# Verdict (for product detail page)
# ─────────────────────────────────────────────────────────────────────────────
def compute_verdict(best_price: Optional[float], all_listings: list[dict], confidence: int) -> dict:
    if best_price is None:
        return {"verdict": "NEUTRAL", "verdictText": "Not enough data to make a recommendation."}

    clean, _ = remove_price_outliers([l for l in all_listings if l.get("price")])
    prices = [l["price"] for l in clean if l.get("price")]
    if not prices:
        return {"verdict": "NEUTRAL", "verdictText": "Not enough price data."}

    market_avg = float(np.mean(prices))

    if confidence < VERDICT_CAUTION_MIN_CONF:
        return {"verdict": "CAUTION", "verdictText": f"Low data confidence ({confidence}%). Verify the price before buying."}

    ratio = best_price / market_avg
    if ratio <= VERDICT_GREAT_THRESHOLD:
        return {"verdict": "GREAT_BUY", "verdictText": f"₹{best_price:,.0f} is significantly below the market average of ₹{market_avg:,.0f}. Great time to buy."}
    if ratio <= VERDICT_GOOD_THRESHOLD:
        return {"verdict": "GOOD_DEAL", "verdictText": f"₹{best_price:,.0f} is close to the market average of ₹{market_avg:,.0f}. A fair price."}
    if ratio >= VERDICT_CAUTION_THRESHOLD:
        return {"verdict": "CAUTION", "verdictText": f"₹{best_price:,.0f} is above the market average of ₹{market_avg:,.0f}. Consider waiting for a sale."}
    return {"verdict": "NEUTRAL", "verdictText": f"₹{best_price:,.0f} is at the market average of ₹{market_avg:,.0f}."}
