// Realistic mock data for frontend development before backend is wired

// Product images — picsum.photos with named seeds (always available, consistent per seed)
const IMGS = {
    kurti1: 'https://picsum.photos/seed/kurti1/400/533',
    kurti2: 'https://picsum.photos/seed/kurti2/400/533',
    kurti3: 'https://picsum.photos/seed/kurti3/400/533',
    kurti4: 'https://picsum.photos/seed/kurti4/400/533',
    kurti5: 'https://picsum.photos/seed/kurti5/400/533',
    kurti6: 'https://picsum.photos/seed/kurti6/400/533',
    saree: 'https://picsum.photos/seed/saree1/400/533',
    ethnic: 'https://picsum.photos/seed/ethnic1/400/533',
};

// similarity_score  = how close this listing is to the search query (embedding + attribute overlay)
// confidence_score  = data quality / match confidence across stores (completeness, source reliability)
// These are deliberately different values to demonstrate they serve different purposes.

export const MOCK_SEARCH_RESULTS = {
    query: 'cotton kurti',
    viewMode: 'default',         // "default" | "brand" | "category" — from API, not inferred
    partial: false,              // true → some sources timed out
    warnings: [],
    results: {
        // Flat list — sorted by similarity_score DESC (highest first = best query match)
        items: [
            { id: 'p1', title: 'Libas Women Blue & White Floral Printed Pure Cotton Kurti', price: 899,  original_price: 1799, image: IMGS.kurti1, source: 'Myntra',   url: 'https://www.myntra.com',   is_official: false, is_popular: true,  similarity_score: 96, confidence_score: 91 },
            { id: 'p2', title: 'Libas Women Blue & White Floral Cotton Kurti',               price: 1049, original_price: 1799, image: IMGS.kurti1, source: 'Amazon',   url: 'https://www.amazon.in',    is_official: false, is_popular: true,  similarity_score: 94, confidence_score: 88 },
            { id: 'p3', title: 'Libas Blue Floral Cotton Kurti — Official Store',            price: 1299, original_price: null, image: IMGS.kurti1, source: 'Libas',    url: 'https://www.libas.in',     is_official: true,  is_popular: false, similarity_score: 93, confidence_score: 95 },
            { id: 'p4', title: 'Libas Women Pink Floral Printed Pure Cotton Kurti',          price: 799,  original_price: 1599, image: IMGS.kurti5, source: 'Flipkart', url: 'https://www.flipkart.com', is_official: false, is_popular: true,  similarity_score: 81, confidence_score: 84 },
            { id: 'p5', title: 'Libas Women Green Printed Cotton Kurti',                     price: 849,  original_price: 1699, image: IMGS.kurti6, source: 'Ajio',     url: 'https://www.ajio.com',     is_official: false, is_popular: true,  similarity_score: 78, confidence_score: 80 },
            { id: 'p6', title: 'Biba Women Cotton Straight Kurti',                           price: 1199, original_price: 2499, image: IMGS.kurti2, source: 'Myntra',   url: 'https://www.myntra.com',   is_official: false, is_popular: true,  similarity_score: 67, confidence_score: 74 },
            { id: 'p7', title: 'W Women Regular Fit Cotton Kurti',                           price: 999,  original_price: 1999, image: IMGS.kurti3, source: 'Nykaa',    url: 'https://www.nykaa.com',    is_official: false, is_popular: true,  similarity_score: 61, confidence_score: 70 },
            { id: 'p8', title: 'FabIndia Cotton Kurta Block Print',                          price: 1749, original_price: null, image: IMGS.ethnic, source: 'FabIndia', url: 'https://www.fabindia.com', is_official: true,  is_popular: false, similarity_score: 54, confidence_score: 88 },
            { id: 'p9', title: 'Global Desi Printed A-Line Kurti',                           price: 699,  original_price: 1399, image: IMGS.kurti4, source: 'Amazon',   url: 'https://www.amazon.in',    is_official: false, is_popular: true,  similarity_score: 49, confidence_score: 62 },
        ],
    },
    insight: {
        recommendation_text: 'Myntra has the best price at ₹899 with 50% off. The same product is available on Amazon for ₹150 more.',
        best_value: { title: 'Libas Cotton Kurti on Myntra', reason: 'Myntra' },
    },
};

export const MOCK_PRODUCT = {
    id: 'p1',
    title: 'Libas Women Blue & White Floral Printed Pure Cotton Kurti',
    brand: 'Libas',
    category: 'Kurtas & Kurtis',
    image: IMGS.kurti1,
    rating: 4.3,
    review_count: 1842,
    in_stock: true,
    best_price: 899,
    best_store: 'Myntra',
    market_avg: 1100,
    confidence_score: 91,  // shown on product page as "Match confidence: 91%"
    ai_verdict: 'GREAT BUY',
    ai_text: 'Priced 18% below the market average. Based on 91% match confidence and price vs market, Myntra currently offers the best deal.',
    offers: [
        { store: 'Myntra',   price: 899,  original_price: 1799, match_pct: 100, url: 'https://www.myntra.com',   is_popular: true,  is_best: true  },
        { store: 'Amazon',   price: 1049, original_price: 1799, match_pct: 100, url: 'https://www.amazon.in',    is_popular: true,  is_best: false },
        { store: 'Libas',    price: 1299, original_price: null, match_pct: 100, url: 'https://www.libas.in',     is_popular: false, is_official: true, is_best: false },
        { store: 'Flipkart', price: 950,  original_price: 1799, match_pct: 97,  url: 'https://www.flipkart.com', is_popular: true,  is_best: false },
        { store: 'Ajio',     price: 1099, original_price: 1799, match_pct: 95,  url: 'https://www.ajio.com',     is_popular: true,  is_best: false },
    ],
    price_history: [
        { date: 'Sep', price: 1400 }, { date: 'Oct', price: 1299 }, { date: 'Nov', price: 1099 },
        { date: 'Dec', price: 999  }, { date: 'Jan', price: 1199 }, { date: 'Feb', price: 899  },
    ],
    similar: [
        { id: 's1', title: 'Biba Cotton Straight Kurti',    price: 1199, image: IMGS.kurti2, source: 'Myntra'   },
        { id: 's2', title: 'W Regular Fit Cotton Kurti',    price: 999,  image: IMGS.kurti3, source: 'Nykaa'    },
        { id: 's3', title: 'FabIndia Block Print Kurta',    price: 1749, image: IMGS.ethnic, source: 'FabIndia' },
        { id: 's4', title: 'Global Desi A-Line Kurti',      price: 699,  image: IMGS.kurti4, source: 'Amazon'   },
        { id: 's5', title: 'Anouk Ethnic Printed Kurti',    price: 849,  image: IMGS.kurti5, source: 'Myntra'   },
    ],
};
