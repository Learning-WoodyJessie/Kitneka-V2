"""
discovery.py — POST /discovery/search unified search endpoint.

Implements the full pipeline from PIPELINE_SPEC.md:
  Normalize Request → SERP Search → Extract → Normalize → Canonical
  → Dedup → Embed (batched) → Rank (2-stage) → Paginate → Response
"""

import json
import uuid
import hashlib
import logging
import asyncio
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
import httpx

from app.config import (
    SERPAPI_KEY, SERP_TIMEOUT_S, DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT,
    CACHE_SEARCH_TTL, CACHE_SNAP_TTL, CACHE_PRICE_TTL,
    EMBEDDING_MODEL_VER,
)
from app.services.normalizer import (
    normalize_listing, canonical_embed_text, dedup, remove_price_outliers,
)
from app.services.embeddings import embed_text, embed_batch
from app.services.ranking import rank_listings, sort_listings, compute_verdict
from app.services.query_preprocessor import QueryPreprocessor

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/discovery", tags=["discovery"])
preprocessor = QueryPreprocessor()


# ─────────────────────────────────────────────────────────────────────────────
# Request / Response models
# ─────────────────────────────────────────────────────────────────────────────
class SearchFilters(BaseModel):
    priceMin:    Optional[float] = None
    priceMax:    Optional[float] = None
    inStockOnly: bool = False
    storeIds:    list[str] = []


class SearchRequest(BaseModel):
    type:       str = "query"          # query | url | image | brand | category
    q:          Optional[str] = None
    url:        Optional[str] = None
    image:      Optional[str] = None   # base64
    brandId:    Optional[str] = None
    brandName:  Optional[str] = None
    categoryId: Optional[str] = None
    filters:    SearchFilters = Field(default_factory=SearchFilters)
    sort:       str = "similarity"     # similarity | price_asc | popularity
    cursor:     Optional[str] = None
    limit:      int = DEFAULT_PAGE_LIMIT


class PriceRefreshRequest(BaseModel):
    storeUrls: list[str]


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────
def _request_hash(req: SearchRequest) -> str:
    key_data = {
        "type": req.type, "q": req.q, "url": req.url,
        "brandId": req.brandId, "categoryId": req.categoryId,
        "filters": req.filters.model_dump(), "sort": req.sort,
    }
    return hashlib.sha256(json.dumps(key_data, sort_keys=True).encode()).hexdigest()[:20]


def _get_redis(request: Request):
    return getattr(request.app.state, "redis", None)


def _clean_item(listing: dict) -> dict:
    """Strip internal scoring fields before returning to client."""
    INTERNAL = {"_embSim", "_finalScore", "_attrSim", "sourceType", "rawId", "rawTitle"}
    return {k: v for k, v in listing.items() if k not in INTERNAL}


def _apply_filters(listings: list[dict], filters: SearchFilters) -> list[dict]:
    result = []
    for l in listings:
        price = l.get("price") or 0
        if filters.priceMin is not None and price < filters.priceMin:
            continue
        if filters.priceMax is not None and price > filters.priceMax:
            continue
        if filters.inStockOnly and not l.get("inStock"):
            continue
        if filters.storeIds and l.get("storeId") not in filters.storeIds:
            continue
        result.append(l)
    return result


# ─────────────────────────────────────────────────────────────────────────────
# SERP search
# ─────────────────────────────────────────────────────────────────────────────
async def _serp_search(query: str, num: int = 20) -> list[dict]:
    """Fetch results from SerpAPI Google Shopping."""
    if not SERPAPI_KEY:
        logger.warning("SERPAPI_KEY not set — returning empty results")
        return []

    params = {
        "engine":  "google_shopping",
        "q":       query,
        "api_key": SERPAPI_KEY,
        "hl":      "en",
        "gl":      "in",
        "num":     str(num),
    }
    try:
        async with httpx.AsyncClient(timeout=SERP_TIMEOUT_S) as client:
            resp = await client.get("https://serpapi.com/search", params=params)
            resp.raise_for_status()
            data = resp.json()
            return data.get("shopping_results", [])
    except Exception as e:
        logger.error(f"SERP search failed for '{query}': {e}")
        return []


# ─────────────────────────────────────────────────────────────────────────────
# Main search endpoint
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/search")
async def unified_search(req: SearchRequest, request: Request):
    redis = _get_redis(request)
    limit = min(req.limit or DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT)

    # ── Cursor / pagination (snapshot pattern) ────────────────────────────────
    if req.cursor:
        return await _paginate_from_cursor(req.cursor, limit, redis)

    cache_key = f"search:{EMBEDDING_MODEL_VER}:{_request_hash(req)}"

    # ── Check search cache ────────────────────────────────────────────────────
    if redis:
        cached = redis.get(cache_key)
        if cached:
            data = json.loads(cached)
            return _slice_response(data, 0, limit, req)

    # ── Step 1: Normalize request → reference text + UI context ─────────────
    try:
        reference_text, ui_ctx = preprocessor.resolve(req.model_dump())
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not reference_text:
        raise HTTPException(status_code=400, detail="Could not resolve a search query from the request.")

    partial = False
    warnings: list[str] = []

    # ── Step 2: SERP search (async) + embed reference (async) — in parallel ──
    serp_task  = asyncio.create_task(_serp_search(reference_text, num=30))
    ref_embed  = embed_text(reference_text, redis_client=redis)   # blocking but fast (cached usually)
    raw_results = await serp_task

    if not raw_results:
        partial = True
        warnings.append("source:serp no results")

    # ── Step 3: Normalize all raw results ─────────────────────────────────────
    normalized = [normalize_listing(r, source_type="serp") for r in raw_results]
    normalized = [l for l in normalized if l.get("price") is not None]

    # ── Step 4: Dedup ─────────────────────────────────────────────────────────
    normalized = dedup(normalized)

    # ── Step 5: Apply filters ─────────────────────────────────────────────────
    normalized = _apply_filters(normalized, req.filters)

    if not normalized:
        return {
            "viewMode":      ui_ctx.get("viewMode", "default"),
            "brand":         ui_ctx.get("brand"),
            "totalCount":    0,
            "items":         [],
            "nextCursor":    None,
            "partial":       partial,
            "warnings":      warnings,
            "schemaVersion": "v1",
        }

    # ── Step 6: Batch embed all candidates (ONE API call) ────────────────────
    embed_texts = [canonical_embed_text(l) for l in normalized]
    candidate_embeddings = embed_batch(embed_texts, redis_client=redis)

    # ── Step 7: Two-stage rank ────────────────────────────────────────────────
    reference_dict = {"title": reference_text, "brand": "", "category": ""}
    ranked = rank_listings(
        normalized,
        reference=reference_dict,
        reference_embedding=ref_embed,
        candidate_embeddings=candidate_embeddings,
    )

    # ── Step 8: Sort ──────────────────────────────────────────────────────────
    default_sort = ui_ctx.get("defaultSort", req.sort)
    sorted_items = sort_listings(ranked, sort=default_sort)

    # Assign stable IDs
    for i, item in enumerate(sorted_items):
        item.setdefault("id", f"item_{i}_{item.get('rawId', '')}")

    # ── Step 9: Pagination snapshot ───────────────────────────────────────────
    session_id = str(uuid.uuid4())
    snapshot   = [{"id": l.get("id"), "score": l.get("_finalScore", 0)} for l in sorted_items]
    if redis:
        redis.setex(f"snap:{EMBEDDING_MODEL_VER}:{session_id}", CACHE_SNAP_TTL, json.dumps(snapshot))

    total = len(sorted_items)
    page  = sorted_items[:limit]
    next_cursor = f"{session_id}:{limit}" if total > limit else None

    response = {
        "viewMode":      ui_ctx.get("viewMode", "default"),
        "brand":         ui_ctx.get("brand"),
        "totalCount":    total,
        "items":         [_clean_item(l) for l in page],
        "nextCursor":    next_cursor,
        "partial":       partial,
        "warnings":      warnings,
        "schemaVersion": "v1",
    }

    # ── Step 10: Cache response ───────────────────────────────────────────────
    if redis:
        redis.setex(cache_key, CACHE_SEARCH_TTL, json.dumps(response))

    return response


# ─────────────────────────────────────────────────────────────────────────────
# Cursor pagination
# ─────────────────────────────────────────────────────────────────────────────
async def _paginate_from_cursor(cursor: str, limit: int, redis) -> dict:
    try:
        session_id, offset_str = cursor.rsplit(":", 1)
        offset = int(offset_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid cursor")

    if not redis:
        raise HTTPException(status_code=410, detail="Pagination requires caching. Session expired.")

    snap_raw = redis.get(f"snap:{EMBEDDING_MODEL_VER}:{session_id}")
    if not snap_raw:
        raise HTTPException(status_code=410, detail="Session expired. Please restart the search.")

    snapshot: list[dict] = json.loads(snap_raw)
    total    = len(snapshot)
    page     = snapshot[offset: offset + limit]
    next_cursor = f"{session_id}:{offset+limit}" if offset + limit < total else None

    return {
        "totalCount": total,
        "items":      page,   # snapshot only has id+score; client refetches details if needed
        "nextCursor": next_cursor,
        "schemaVersion": "v1",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Price refresh (staleness fix — PIPELINE_SPEC §price_staleness)
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/prices/refresh")
async def refresh_prices(req: PriceRefreshRequest, request: Request):
    """
    Lightweight price refresh for cached results.
    Frontend calls this after rendering a cached search page.
    TTL: 30s so prices stay fresh without hammering sources.
    """
    redis = _get_redis(request)
    results = []

    for url in req.storeUrls[:20]:   # cap at 20 per request
        cache_key = f"price:v1:{hashlib.sha256(url.encode()).hexdigest()[:16]}"
        cached = redis.get(cache_key) if redis else None

        if cached:
            results.append(json.loads(cached))
            continue

        # Lightweight HEAD request to check availability (no scraping needed for price)
        entry = {"storeUrl": url, "price": None, "inStock": None, "fromCache": False}
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.head(url, follow_redirects=True)
                entry["inStock"] = resp.status_code == 200
        except Exception:
            entry["inStock"] = None

        if redis:
            redis.setex(cache_key, CACHE_PRICE_TTL, json.dumps(entry))
        results.append(entry)

    return results


# ─────────────────────────────────────────────────────────────────────────────
# Helper
# ─────────────────────────────────────────────────────────────────────────────
def _slice_response(data: dict, offset: int, limit: int, req: SearchRequest) -> dict:
    items = data.get("items", [])
    return {**data, "items": items[offset: offset + limit]}
