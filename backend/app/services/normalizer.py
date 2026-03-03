"""
normalizer.py — Extract → Normalize → Canonical text pipeline.

Responsibilities:
  1. clean_title()              Strip SERP boilerplate before embedding
  2. normalize_listing()        Map raw source fields → unified schema (INR)
  3. canonical_embed_text()     Build deterministic embedding string
  4. dedup()                    Remove near-duplicate listings per store+price bucket
  5. remove_price_outliers()    IQR-based split for marketAvg / verdict
  6. field_completeness()       Fraction of required fields that are non-null
"""

import re
import logging
import numpy as np
from typing import Optional

logger = logging.getLogger(__name__)

# ── Required fields for completeness scoring ──────────────────────────────────
REQUIRED_FIELDS = ("title", "brand", "price", "imageUrl", "storeUrl", "rating", "inStock")

# ── Store reliability registry (static; extend as needed) ────────────────────
STORE_RELIABILITY: dict[str, float] = {
    "amazon":    0.95,
    "flipkart":  0.90,
    "myntra":    0.88,
    "ajio":      0.85,
    "nykaa":     0.85,
    "tata cliq": 0.85,
    "meesho":    0.70,
    "snapdeal":  0.70,
    "instagram": 0.55,
    "unknown":   0.50,
}

# ── Boilerplate patterns to strip from SERP titles ────────────────────────────
_BOILERPLATE = [
    r"\|.*$",
    r"buy\s+.+?\s+online",
    r"at\s+best\s+price\s+in\s+india",
    r"free\s+(shipping|delivery)",
    r"\b(amazon|flipkart|myntra|ajio|nykaa|snapdeal|meesho|tatacliq)\b[\.\w]*",
    r"-\s*(shop|store|official)",
    r"\bshop\s+now\b",
    r"\d+%\s+off",
]
_BOILERPLATE_RE = [re.compile(p, re.IGNORECASE) for p in _BOILERPLATE]


# ─────────────────────────────────────────────────────────────────────────────
# 1. Title cleaning
# ─────────────────────────────────────────────────────────────────────────────
def clean_title(raw: str) -> str:
    s = raw or ""
    for pat in _BOILERPLATE_RE:
        s = pat.sub("", s)
    return re.sub(r"\s{2,}", " ", s).strip()


# ─────────────────────────────────────────────────────────────────────────────
# 2. Normalize raw listing → unified schema
# ─────────────────────────────────────────────────────────────────────────────
def normalize_listing(raw: dict, source_type: str = "serp") -> dict:
    raw_title = (
        raw.get("title") or raw.get("product_name") or raw.get("name") or ""
    )
    title = clean_title(raw_title)

    # Price → INR float
    for price_key in ("price", "sale_price", "current_price", "extracted_price"):
        price_raw = raw.get(price_key)
        if price_raw is not None:
            break
    try:
        price = float(str(price_raw).replace(",", "").replace("₹", "").strip())
    except (TypeError, ValueError):
        price = None

    for op_key in ("original_price", "mrp", "was_price"):
        op_raw = raw.get(op_key)
        if op_raw is not None:
            break
    try:
        original_price = float(str(op_raw).replace(",", "").replace("₹", "").strip())
    except (TypeError, ValueError):
        original_price = None

    brand    = (raw.get("brand") or raw.get("manufacturer") or "").strip()
    category = (raw.get("category") or raw.get("type") or "").strip()
    store    = (raw.get("source") or raw.get("store") or raw.get("merchant") or "").strip()
    store_id = _resolve_store_id(store)

    store_url = raw.get("link") or raw.get("url") or raw.get("product_link") or ""
    image_url = raw.get("thumbnail") or raw.get("image") or raw.get("image_url") or ""

    try:
        rating = float(raw.get("rating") or 0)
        rating = rating if 0 < rating <= 5 else None
    except (TypeError, ValueError):
        rating = None

    try:
        review_count = int(raw.get("reviews") or raw.get("review_count") or raw.get("ratings_total") or 0)
        review_count = review_count if review_count >= 0 else None
    except (TypeError, ValueError):
        review_count = None

    avail = raw.get("availability", "").lower()
    in_stock = raw.get("in_stock", avail not in {"out of stock", "unavailable"})

    return {
        "title":         title,
        "rawTitle":      raw_title,
        "brand":         brand,
        "category":      category,
        "price":         price,
        "originalPrice": original_price,
        "store":         store,
        "storeId":       store_id,
        "storeUrl":      store_url,
        "imageUrl":      image_url,
        "rating":        rating,
        "reviewCount":   review_count,
        "inStock":       bool(in_stock),
        "isOfficial":    bool(raw.get("is_official", False)),
        "isPopular":     bool(raw.get("is_popular", False)),
        "isCleanBeauty": _is_clean_beauty(category, brand),
        "rawId":         str(raw.get("product_id") or raw.get("id") or raw.get("position") or ""),
        "sourceId":      raw.get("source_id", source_type),
        "sourceType":    source_type,
        "badges":        list(raw.get("badges", [])),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 3. Canonical embedding text
# ─────────────────────────────────────────────────────────────────────────────
def canonical_embed_text(listing: dict) -> str:
    """Deterministic format: '{title} {brand} {category}' (lowercase, trimmed)."""
    parts = [
        listing.get("title",    "").strip(),
        listing.get("brand",    "").strip(),
        listing.get("category", "").strip(),
    ]
    return " ".join(p for p in parts if p).lower()


# ─────────────────────────────────────────────────────────────────────────────
# 4. Dedup — same store × price bucket
# ─────────────────────────────────────────────────────────────────────────────
def dedup(listings: list[dict]) -> list[dict]:
    def completeness(l):
        return sum(1 for f in REQUIRED_FIELDS if l.get(f) not in (None, "", 0)) / len(REQUIRED_FIELDS)

    seen: dict[tuple, dict] = {}
    for listing in sorted(listings, key=completeness, reverse=True):
        key = (listing.get("storeId", ""), round((listing.get("price") or 0) / 100) * 100)
        if key not in seen:
            seen[key] = listing

    result = list(seen.values())
    logger.debug(f"dedup: {len(listings)} → {len(result)}")
    return result


# ─────────────────────────────────────────────────────────────────────────────
# 5. IQR outlier split
# ─────────────────────────────────────────────────────────────────────────────
def remove_price_outliers(listings: list[dict]) -> tuple[list[dict], list[dict]]:
    prices = [l["price"] for l in listings if l.get("price") is not None]
    if len(prices) < 4:
        return listings, []

    arr = np.array(prices)
    q1, q3 = np.percentile(arr, [25, 75])
    iqr = q3 - q1
    lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr

    clean, outliers = [], []
    for l in listings:
        p = l.get("price")
        if p is None or (lower <= p <= upper):
            clean.append(l)
        else:
            flagged = {**l, "badges": list(set(l.get("badges", []) + ["PRICE_OUTLIER"]))}
            outliers.append(flagged)

    return clean, outliers


# ─────────────────────────────────────────────────────────────────────────────
# 6. Field completeness
# ─────────────────────────────────────────────────────────────────────────────
def field_completeness(listing: dict) -> float:
    return sum(1 for f in REQUIRED_FIELDS if listing.get(f) not in (None, "", 0)) / len(REQUIRED_FIELDS)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────
def _resolve_store_id(store: str) -> str:
    s = store.lower()
    for known in STORE_RELIABILITY:
        if known in s:
            return known
    return s or "unknown"


def get_store_reliability(store_id: str) -> float:
    return STORE_RELIABILITY.get((store_id or "").lower(), 0.50)


def _is_clean_beauty(category: str, brand: str) -> bool:
    KEYWORDS = {"organic", "natural", "clean beauty", "ayurvedic", "vegan", "cruelty-free"}
    text = f"{category} {brand}".lower()
    return any(kw in text for kw in KEYWORDS)
