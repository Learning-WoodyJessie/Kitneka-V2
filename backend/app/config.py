"""
config.py — All tunable constants loaded from env vars with safe defaults.
Change behaviour by setting env vars; no code changes needed.
"""
import os

# ── Embedding ────────────────────────────────────────────────────────────────
EMBEDDING_MODEL        = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
EMBEDDING_MODEL_VER    = os.getenv("EMBEDDING_MODEL_VER", "v1")
CANONICAL_EMBED_FORMAT = os.getenv("CANONICAL_EMBED_FORMAT", "{title} {brand} {category}")

# ── Ranking ───────────────────────────────────────────────────────────────────
RANKING_ALPHA          = float(os.getenv("RANKING_ALPHA",  "0.70"))  # embedding weight
RANKING_BETA           = float(os.getenv("RANKING_BETA",   "0.30"))  # attribute weight
RANKING_TOP_K          = int(os.getenv("RANKING_TOP_K",    "50"))    # candidates for stage 2
RANKING_POPULAR_BOOST  = int(os.getenv("RANKING_POPULAR_BOOST", "5"))

# ── Confidence score weights ──────────────────────────────────────────────────
CONF_W_SIMILARITY   = float(os.getenv("CONF_W_SIMILARITY",   "0.50"))
CONF_W_COMPLETENESS = float(os.getenv("CONF_W_COMPLETENESS", "0.20"))
CONF_W_RELIABILITY  = float(os.getenv("CONF_W_RELIABILITY",  "0.20"))
CONF_W_VISUAL       = float(os.getenv("CONF_W_VISUAL",       "0.10"))

# ── Verdict thresholds ────────────────────────────────────────────────────────
VERDICT_GREAT_THRESHOLD   = float(os.getenv("VERDICT_GREAT_THRESHOLD",   "0.85"))
VERDICT_GOOD_THRESHOLD    = float(os.getenv("VERDICT_GOOD_THRESHOLD",    "0.95"))
VERDICT_CAUTION_THRESHOLD = float(os.getenv("VERDICT_CAUTION_THRESHOLD", "1.15"))
VERDICT_CAUTION_MIN_CONF  = int(os.getenv("VERDICT_CAUTION_MIN_CONF",    "60"))

# ── Caching (Redis) ───────────────────────────────────────────────────────────
REDIS_URL              = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CACHE_SEARCH_TTL       = int(os.getenv("CACHE_SEARCH_TTL",   "600"))   # 10 min
CACHE_SOURCE_TTL       = int(os.getenv("CACHE_SOURCE_TTL",   "480"))   # 8 min
CACHE_PRODUCT_TTL      = int(os.getenv("CACHE_PRODUCT_TTL",  "180"))   # 3 min
CACHE_EMBED_TTL        = int(os.getenv("CACHE_EMBED_TTL",    "604800"))# 7 days
CACHE_SNAP_TTL         = int(os.getenv("CACHE_SNAP_TTL",     "600"))   # 10 min (pagination snapshot)
CACHE_PRICE_TTL        = int(os.getenv("CACHE_PRICE_TTL",    "30"))    # 30s (price refresh)

# ── API keys ──────────────────────────────────────────────────────────────────
OPENAI_API_KEY         = os.getenv("OPENAI_API_KEY", "")
SERPAPI_KEY            = os.getenv("SERPAPI_API_KEY", "")

# ── Latency budgets (seconds) ─────────────────────────────────────────────────
SERP_TIMEOUT_S         = float(os.getenv("SERP_TIMEOUT_S",   "8.0"))
SCRAPE_TIMEOUT_S       = float(os.getenv("SCRAPE_TIMEOUT_S", "5.0"))

# ── Pagination ────────────────────────────────────────────────────────────────
DEFAULT_PAGE_LIMIT     = int(os.getenv("DEFAULT_PAGE_LIMIT",  "24"))
MAX_PAGE_LIMIT         = int(os.getenv("MAX_PAGE_LIMIT",      "100"))

# ── Image upload limits ───────────────────────────────────────────────────────
IMAGE_MAX_BYTES        = int(os.getenv("IMAGE_MAX_BYTES",     str(10 * 1024 * 1024)))  # 10 MB
IMAGE_MAX_DIM          = int(os.getenv("IMAGE_MAX_DIM",       "4096"))
IMAGE_RATE_UNAUTH      = int(os.getenv("IMAGE_RATE_UNAUTH",   "5"))   # per min per IP
IMAGE_RATE_AUTH        = int(os.getenv("IMAGE_RATE_AUTH",     "20"))  # per min per user

# ── Similar products ─────────────────────────────────────────────────────────
SIMILAR_PRODUCTS_CAP        = int(os.getenv("SIMILAR_PRODUCTS_CAP",       "10"))
SIMILAR_PRODUCTS_PRICE_BAND = float(os.getenv("SIMILAR_PRODUCTS_PRICE_BAND", "0.40"))  # ±40%
