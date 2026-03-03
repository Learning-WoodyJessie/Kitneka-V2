"""
main.py — KitneKa V2 FastAPI application entry point.

Startup:
  - Connects to Redis (non-fatal if unavailable; caching degrades gracefully)
  - Registers all routers
  - Configures CORS for local dev + production domains
"""

import logging
import os
import redis as redis_lib
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.config import REDIS_URL
from app.routers.discovery import router as discovery_router

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s — %(message)s")
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Lifespan — Redis connect / disconnect
# ─────────────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        rc = redis_lib.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=2)
        rc.ping()
        app.state.redis = rc
        logger.info(f"✅ Redis connected: {REDIS_URL}")
    except Exception as e:
        logger.warning(f"⚠️  Redis unavailable ({e}). Caching disabled — search will still work.")
        app.state.redis = None

    yield  # app is running

    # Shutdown
    if getattr(app.state, "redis", None):
        app.state.redis.close()
        logger.info("Redis connection closed")


# ─────────────────────────────────────────────────────────────────────────────
# App
# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="KitneKa V2 API",
    description="Unified search & price comparison — India's smart shopping assistant",
    version="2.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    os.getenv("FRONTEND_URL", ""),
    "https://kitneka.com",
    "https://www.kitneka.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in ALLOWED_ORIGINS if o],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(discovery_router)


# ── Health ───────────────────────────────────────────────────────────────────
@app.get("/", tags=["health"])
async def root():
    return {"status": "ok", "version": "2.0.0", "service": "KitneKa V2 API"}


@app.get("/health", tags=["health"])
async def health():
    redis_ok = False
    if app.state.redis:
        try:
            app.state.redis.ping()
            redis_ok = True
        except Exception:
            pass
    return {
        "status": "ok",
        "redis":  "connected" if redis_ok else "unavailable",
        "version": "2.0.0",
    }
