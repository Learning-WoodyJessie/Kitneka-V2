"""
query_preprocessor.py — Resolves all 5 entry types into a single reference text + UI context.

Entry types and resolution:
  query    → q as-is (+ Hindi/Hinglish transliteration if needed)
  url      → scrape page, extract product JSON-LD → title + brand + category
  image    → GPT-4o Vision → extracted product name + attributes
  brand    → brandName + " " + q (query expansion)
  category → categoryQuery + " " + q
"""

import re
import logging
import base64
from typing import Optional

import httpx
from openai import OpenAI
from bs4 import BeautifulSoup

from app.config import OPENAI_API_KEY, SCRAPE_TIMEOUT_S

logger = logging.getLogger(__name__)

_client: Optional[OpenAI] = None


def _get_client() -> Optional[OpenAI]:
    global _client
    if _client is None and OPENAI_API_KEY:
        _client = OpenAI(api_key=OPENAI_API_KEY)
    return _client


# ── Hindi / Devanagari detection + transliteration ───────────────────────────
_DEVANAGARI_RE = re.compile(r"[\u0900-\u097F]")


def _maybe_transliterate(text: str) -> str:
    """If text contains Devanagari, transliterate to Latin using indic-transliteration."""
    if not _DEVANAGARI_RE.search(text):
        return text
    try:
        from indic_transliteration import sanscript
        from indic_transliteration.sanscript import transliterate
        return transliterate(text, sanscript.DEVANAGARI, sanscript.IAST)
    except Exception:
        logger.warning("Hindi transliteration failed — using raw text")
        return text


# ── Allowlisted domains (SSRF protection) ────────────────────────────────────
_ALLOWED_DOMAINS = {
    "amazon.in", "flipkart.com", "myntra.com", "ajio.com",
    "nykaa.com", "tatacliq.com", "meesho.com", "snapdeal.com",
    "jabong.com", "shoppersstop.com", "westside.com",
}


def _is_allowed_url(url: str) -> bool:
    from urllib.parse import urlparse
    try:
        host = urlparse(url).hostname or ""
        return any(host == d or host.endswith(f".{d}") for d in _ALLOWED_DOMAINS)
    except Exception:
        return False


class QueryPreprocessor:
    """Resolves a search request dict into (reference_text, ui_context)."""

    def resolve(self, req: dict) -> tuple[str, dict]:
        entry_type = req.get("type", "query")
        ui_ctx: dict = {"viewMode": "default", "brand": None, "defaultSort": req.get("sort", "similarity")}

        if entry_type == "query":
            text = _maybe_transliterate((req.get("q") or "").strip())
            return text, ui_ctx

        if entry_type == "brand":
            brand_name = req.get("brandName") or req.get("brandId") or ""
            q = (req.get("q") or "").strip()
            expanded = f"{brand_name} {q}".strip() if q else brand_name
            ui_ctx.update({"viewMode": "brand", "brand": {"name": brand_name}, "defaultSort": "popularity"})
            return expanded, ui_ctx

        if entry_type == "category":
            category_id = req.get("categoryId") or ""
            q = (req.get("q") or "").strip()
            # Map category IDs to human-readable shopping queries
            CATEGORY_QUERIES = {
                "womens":       "Women's fashion clothing",
                "mens":         "Men's fashion clothing",
                "kids":         "Kids clothing and wear",
                "sport":        "Sportswear activewear",
                "footwear":     "Women's footwear shoes",
                "jewellery":    "Jewellery sets",
                "accessories":  "Fashion accessories",
                "beauty":       "Beauty skincare",
                "watches":      "Watches for women",
                "clean-beauty": "Organic natural clean beauty",
            }
            cat_query = CATEGORY_QUERIES.get(category_id, category_id)
            combined = f"{cat_query} {q}".strip() if q else cat_query
            ui_ctx.update({"viewMode": "category"})
            return combined, ui_ctx

        if entry_type == "url":
            url = (req.get("url") or "").strip()
            if not _is_allowed_url(url):
                raise ValueError(f"URL not in allowlist: {url}")
            product = _scrape_url(url)
            text = f"{product.get('title','')} {product.get('brand','')} {product.get('category','')}".strip()
            return text, ui_ctx

        if entry_type == "image":
            image_b64 = req.get("image") or ""
            text = _analyze_image(image_b64)
            return text, ui_ctx

        # Fallback
        return (req.get("q") or "").strip(), ui_ctx


# ─────────────────────────────────────────────────────────────────────────────
# URL scraping (JSON-LD extraction per PIPELINE_SPEC §6)
# ─────────────────────────────────────────────────────────────────────────────
def _scrape_url(url: str) -> dict:
    import json as _json
    headers = {"User-Agent": "Mozilla/5.0 (compatible; KitneKaBot/1.0)"}
    try:
        with httpx.Client(timeout=SCRAPE_TIMEOUT_S, follow_redirects=True) as client:
            resp = client.get(url, headers=headers)
            resp.raise_for_status()
            html = resp.text
    except httpx.TimeoutException:
        raise ValueError("scrape_timeout: URL took too long to load")
    except Exception as e:
        raise ValueError(f"scrape_error: {e}")

    soup = BeautifulSoup(html, "html.parser")
    products = []
    for tag in soup.find_all("script", type="application/ld+json"):
        try:
            data = _json.loads(tag.string or "{}")
            items = data if isinstance(data, list) else [data]
            for item in items:
                if item.get("@type") == "Product":
                    products.append(item)
        except Exception:
            continue

    if len(products) == 0:
        # Fallback to OG tags
        title = soup.find("meta", property="og:title")
        return {"title": title["content"] if title else "", "brand": "", "category": ""}

    if len(products) == 1:
        p = products[0]
    else:
        # Ambiguity resolution: pick by URL slug
        from urllib.parse import urlparse, unquote
        slug = unquote(urlparse(url).path.rstrip("/").split("/")[-1]).replace("-", " ")
        p = next(
            (p for p in products if slug.lower() in (p.get("name") or "").lower()),
            None,
        )
        if p is None:
            raise ValueError("ambiguous_url: Multiple products found. Paste a direct product URL.")

    brand = ""
    if isinstance(p.get("brand"), dict):
        brand = p["brand"].get("name", "")
    elif isinstance(p.get("brand"), str):
        brand = p["brand"]

    return {
        "title":    p.get("name", ""),
        "brand":    brand,
        "category": p.get("category", ""),
        "image":    p.get("image", ""),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Image analysis (GPT-4o Vision)
# ─────────────────────────────────────────────────────────────────────────────
def _analyze_image(image_b64: str) -> str:
    client = _get_client()
    if not client:
        raise ValueError("OpenAI API key not configured")

    # Ensure data URI format
    if not image_b64.startswith("data:"):
        image_b64 = f"data:image/jpeg;base64,{image_b64}"

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a product identification assistant for an Indian shopping app. "
                        "Examine the image and return ONLY a short product search query (max 15 words), "
                        "suitable for Google Shopping India. Include: product type, brand (if visible), "
                        "color, and key features. No explanation."
                    ),
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "What product is this? Return a search query only."},
                        {"type": "image_url", "image_url": {"url": image_b64, "detail": "low"}},
                    ],
                },
            ],
            max_tokens=60,
            temperature=0,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        raise ValueError(f"Image analysis failed: {e}")
