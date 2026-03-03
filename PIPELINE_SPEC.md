# KitneKa — Backend Pipeline Specification

> Engineer-ready spec for the **Search & Compare** pipeline. All thresholds, formulas, and fallback rules are explicit and config-driven so they can be tuned without code changes.

---

## 1. API Contract

### Single Search Endpoint

**POST** `/discovery/search`

```json
// Request body
{
  "type": "query" | "url" | "image" | "brand" | "category",
  "q":          "string (required for query/brand/category; extracted text for url/image)",
  "url":        "string (for type url)",
  "brandId":    "string (for type brand)",
  "categoryId": "string (for type category)",
  "filters":    { "priceMin": 0, "priceMax": 50000, "inStockOnly": false, "storeIds": [] },
  "sort":       "similarity | price_asc | popularity",
  "cursor":     "string (opaque, for pagination)",
  "limit":      24
}
```

```json
// Response (unified — all entry types)
{
  "viewMode":    "default | brand | category",
  "brand":       { "id": "...", "name": "...", "logoUrl": "...", "officialUrl": "..." },
  "totalCount":  42,
  "items":       [ /* Result Items, sorted by similarity_score DESC by default */ ],
  "nextCursor":  "string | null",
  "partial":     false,
  "warnings":    ["source:flipkart timeout"],
  "schemaVersion": "v1"
}
```

### Result Item shape

```json
{
  "id":             "string",
  "title":          "string",
  "brand":          "string",
  "category":       "string",
  "imageUrl":       "string",
  "source":         "string",
  "storeUrl":       "string",
  "price":          1049,
  "originalPrice":  1799,
  "rating":         4.3,
  "reviewCount":    1842,
  "similarityScore": 94,
  "confidenceScore": 88,
  "inStock":        true,
  "isPopular":      true,
  "isCleanBeauty":  false
}
```

- **`similarityScore`** (0–100): how close this listing is to the request reference (query or URL product). Used for default sort and the card "% match" badge.
- **`confidenceScore`** (0–100): data quality — source reliability, field completeness, price plausibility. Shown on the product detail page as "Match confidence: X%".

---

## 2. Pipeline: Extract → Normalize → Canonical → Rank → Respond

```
Request
  → Normalize Request (resolve to: query_text + filters + reference_type)
  → Search (SERP API / scrapers — parallel per source, timeout 8s per source)
  → Extract  (keep raw per source, no schema changes)
  → Normalize (one intermediate schema: INR, enums, derived fields)
  → Canonical (stable product + listing schema; embedding text built here)
  → Rank (Two-stage: embedding retrieval → attribute overlay re-rank)
  → Snapshot & Paginate
  → Response
```

---

## 3. Ranking — Two-Stage (No Classification)

Results are **not classified** into Exact/Variant/Similar. They are returned as a single flat list ordered by `similarityScore` descending.

### Stage 1 — Embedding Retrieval

- Embed the **request reference** (see §4) and all candidate listings using the pinned embedding model (env: `EMBEDDING_MODEL`, e.g. `text-embedding-3-small`).
- Compute cosine similarity for each candidate vs. the reference.
- Take top-K candidates (env: `RANKING_TOP_K`, default: 50) for Stage 2.

### Stage 2 — Attribute Overlay Re-rank

Extract key discriminating attributes from both the reference and each candidate:
`{ color, material, category, gender, productType }` (parsed from canonical title/brand/category).

```
attributeScore = jaccard_similarity(referenceAttrs, candidateAttrs)

finalScore = RANKING_ALPHA × embeddingScore + RANKING_BETA × attributeScore

similarityScore = round(finalScore × 100)
```

**Config (env):**
```
RANKING_ALPHA = 0.70   # embedding weight
RANKING_BETA  = 0.30   # attribute match weight
RANKING_TOP_K = 50     # candidates entering Stage 2
```

> **Why attributes matter:** Embedding models score "Nike Air Max 270 black" and "Nike Air Max 270 white" nearly identically. The attribute overlay penalises color/style divergence so the right variant surfaces higher.

### Popular Soft Boost (applied after finalScore)

Do not filter by `isPopular`. Instead, apply a small sort boost:

```
sortKey = similarityScore + (isPopular ? POPULAR_BOOST : 0)

POPULAR_BOOST = 5  (env: RANKING_POPULAR_BOOST)
```

All items remain in the list; popular stores naturally surface within the same similarity tier.

---

## 4. Request Reference — One Per Request

| Entry type | Reference | Embedding input |
|---|---|---|
| `query` | Normalized query text | `q` (+ optional brand/category context) |
| `url` | Canonical form of scraped product | `title + " " + brand + " " + category` |
| `image` | Vision-extracted product text | Extracted product name + attributes |
| `brand` | `brandName + " " + q` | Effective combined query string |
| `category` | `categoryQuery + " " + q` | Effective combined query string |

**Canonical embedding text format** (same for both reference and candidates):
```
{title} {brand} {category}
```
This format is a **pinned constant** (`CANONICAL_EMBED_FORMAT` in config). Both sides of cosine similarity must use the same format.

---

## 5. Verdict Thresholds (config-driven)

```
marketAvg = IQR-filtered mean of all offer prices (remove prices outside Q1−1.5×IQR, Q3+1.5×IQR)

GREAT_BUY → price ≤ marketAvg × VERDICT_GREAT_THRESHOLD   (default: 0.85)
GOOD_DEAL → price ≤ marketAvg × VERDICT_GOOD_THRESHOLD    (default: 0.95)
CAUTION   → price > marketAvg × VERDICT_CAUTION_THRESHOLD (default: 1.15)
            OR confidenceScore < VERDICT_CAUTION_MIN_CONF  (default: 60)
NEUTRAL   → everything else
```

**Config (env):**
```
VERDICT_GREAT_THRESHOLD   = 0.85
VERDICT_GOOD_THRESHOLD    = 0.95
VERDICT_CAUTION_THRESHOLD = 1.15
VERDICT_CAUTION_MIN_CONF  = 60
```

---

## 6. URL Scraping — Primary Product Selection Rule

1. Extract all `@type: Product` entities from page JSON-LD.
2. If exactly one → use it as the reference listing.
3. If multiple → pick the one whose `name` field contains the URL's product slug (last non-ID path segment, URL-decoded).
4. If still ambiguous → return `400 { "error": "ambiguous_url", "message": "Multiple products found. Paste a direct product URL." }`.
5. Timeout: **5s**. On timeout → return `400 { "error": "scrape_timeout" }`.

**SSRF protection:** Only fetch URLs matching the allowlisted domain list (loaded from trust registry). Reject private IPs and non-allowlisted hosts before making the request.

---

## 7. INR Normalization

- Fetch exchange rate once per hour; store `{ rate, rateDate }` in Redis, TTL 3600s.
- Include `rateDate` in every normalized record with a converted price.
- If rate fetch fails → **reject the listing** (log + mark `skipped`). Never use a guessed or stale rate.
- For v1: Indian marketplaces (Amazon.in, Flipkart, Myntra, AJIO, Nykaa, Tata CLiQ, FabIndia) return INR natively — no conversion needed. Flag non-INR listings in logs.

---

## 8. Pagination — Snapshot Pattern

```
First request:
  1. Compute full ranked list (all items + scores).
  2. Store [ { listingId, similarityScore } ] in Redis:
     key = "snap:{sessionId}", TTL = 600s (10 min).
  3. Return first {limit} items + nextCursor = "{sessionId}:{offset}".

Subsequent cursor requests:
  1. Parse sessionId + offset from cursor.
  2. Read snapshot from Redis. If missing → 410 Gone, { retry: true }.
  3. Return slice [offset : offset+limit].

Cursor is invalidated on: query change, sort change, filter change.
```

---

## 9. Schema Versioning

Every canonical listing record includes:
```json
{ "schemaVersion": "v1" }
```

Cache key prefix includes schema version:
```
canonical:v1:{listingId}
snap:v1:{sessionId}
emb:v1:{model}:{hash(text)}
```

On schema change → bump suffix to `v2`; old keys expire naturally (no manual flush needed).

---

## 10. Caching

| Object | Key | TTL |
|---|---|---|
| Search response | `search:v1:{hash(normalized_request)}` | 10 min |
| Raw SERP/scrape | `source:{sourceId}:{hash(query)}` | 8 min |
| Product detail | `product:v1:{listingId}` | 3 min |
| Redirect URL | `resolve:{hash(url)}` | 12 hr |
| Embedding | `emb:v1:{model}:{hash(text)}` | 7 days |
| Exchange rate | `fx:inr` | 1 hr |
| Trust registry | loaded at startup, refreshed every 1 hr | — |

**Invalidation rules:**
- Embedding model version change → change `v1` prefix in embedding key.
- Registry update → reload from source; fallback to in-process copy on failure.

---

## 11. Trust Registry Fallback

- Load registry into in-process memory at service startup.  
- Refresh every 1 hr from source; on failure → keep stale copy, log warning.
- **Never fail a search request because the registry is unavailable.**
- Registry controls: `isOfficial` (domain match), `isPopular` (trusted retailer list), `isCleanBeauty` (brand tag).

---

## 12. Image Search Rate Limiting

```
Unauthenticated: 5 requests/min per IP
Authenticated:   20 requests/min per user

Vision API result cache:
  key = "vision:{sha256(normalized_image_bytes)}"
  TTL = 24 hr
```

Max upload: **10 MB**, allowed types: JPEG / PNG / WebP.

---

## 13. Per-Stage Latency Budgets

| Stage | Budget | On exceed |
|---|---|---|
| SERP API (3 sources, parallel) | ≤ 8s | `partial: true`, continue |
| URL scrape | ≤ 5s | `400 scrape_timeout` |
| Normalize + Canonical | ≤ 500ms | Log + alert |
| Embedding batch | ≤ 1.5s | Log + alert |
| Attribute overlay re-rank | ≤ 200ms | Log + alert |
| **Total cold** | **≤ 18s target** | Return with `partial: true` |

---

## 14. similarProducts Definition

- Same `canonicalCategory` as the product.
- Price within ±40% of the product's best price.
- Ordered by `cosineSimilarity(referenceListingEmbedding, candidateEmbedding)` DESC.
- Cap: **10 items**.
- Exclude the product itself (`listingId` not equal).
