"""
embeddings.py — Batch embedding + Redis caching.

Key design:
  - ONE OpenAI Embeddings API call for all candidate titles (batched list input)
  - Redis caches each embedding keyed by model version + text hash (7-day TTL)
  - Cache miss → batch call → store each result individually
"""

import os
import json
import hashlib
import logging
from typing import Optional

from openai import OpenAI
from app.config import (
    OPENAI_API_KEY, EMBEDDING_MODEL, EMBEDDING_MODEL_VER, CACHE_EMBED_TTL
)

logger = logging.getLogger(__name__)

_client: Optional[OpenAI] = None


def _get_client() -> Optional[OpenAI]:
    global _client
    if _client is None and OPENAI_API_KEY:
        _client = OpenAI(api_key=OPENAI_API_KEY)
    return _client


def _embed_key(text: str) -> str:
    h = hashlib.sha256(text.encode()).hexdigest()[:24]
    return f"emb:{EMBEDDING_MODEL_VER}:{EMBEDDING_MODEL}:{h}"


# ─────────────────────────────────────────────────────────────────────────────
# Single embed (for query reference)
# ─────────────────────────────────────────────────────────────────────────────
def embed_text(text: str, redis_client=None) -> list[float]:
    results = embed_batch([text], redis_client=redis_client)
    return results[0]


# ─────────────────────────────────────────────────────────────────────────────
# Batch embed — ONE API call for all texts
# ─────────────────────────────────────────────────────────────────────────────
def embed_batch(texts: list[str], redis_client=None) -> list[list[float]]:
    """
    Embed a list of texts. Returns embeddings in the same order as `texts`.
    Checks Redis cache first; calls OpenAI only for cache misses (batched).
    """
    if not texts:
        return []

    results = [None] * len(texts)
    miss_indices: list[int] = []
    miss_texts:   list[str] = []

    # 1. Check cache
    for i, text in enumerate(texts):
        cached = _get_cached(text, redis_client)
        if cached is not None:
            results[i] = cached
        else:
            miss_indices.append(i)
            miss_texts.append(text)

    if not miss_texts:
        return results  # all cached

    # 2. Batch call for cache misses
    client = _get_client()
    if not client:
        logger.warning("OpenAI client unavailable — returning empty embeddings")
        for i in miss_indices:
            results[i] = []
        return results

    clean = [t.strip() or " " for t in miss_texts]
    try:
        response = client.embeddings.create(model=EMBEDDING_MODEL, input=clean)
        ordered = sorted(response.data, key=lambda d: d.index)
        for list_pos, api_item in enumerate(ordered):
            orig_i   = miss_indices[list_pos]
            embedding = api_item.embedding
            results[orig_i] = embedding
            _set_cached(miss_texts[list_pos], embedding, redis_client)
    except Exception as e:
        logger.error(f"Embedding batch call failed: {e}")
        for i in miss_indices:
            if results[i] is None:
                results[i] = []

    return results


# ─────────────────────────────────────────────────────────────────────────────
# Redis helpers
# ─────────────────────────────────────────────────────────────────────────────
def _get_cached(text: str, redis_client) -> Optional[list[float]]:
    if redis_client is None:
        return None
    try:
        val = redis_client.get(_embed_key(text))
        return json.loads(val) if val else None
    except Exception:
        return None


def _set_cached(text: str, embedding: list[float], redis_client) -> None:
    if redis_client is None:
        return
    try:
        redis_client.setex(_embed_key(text), CACHE_EMBED_TTL, json.dumps(embedding))
    except Exception as e:
        logger.warning(f"Embedding cache write failed: {e}")
