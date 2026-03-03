import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronDown, ExternalLink, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import SideDrawer from '../components/SideDrawer';
import Loader from '../components/Loader';
import ProductCard from '../components/ProductCard';
import FilterSidebar from '../components/FilterSidebar';
import CategoryTiles from '../components/CategoryTiles';
import FeaturedBrands from '../components/FeaturedBrands';
import { MOCK_SEARCH_RESULTS } from '../mockData';
import { API_BASE, FEATURED_BRANDS } from '../config';
const USE_MOCK = false; // Using real V2 backend

// ─── Ranking helpers ──────────────────────────────────────────────────────────
// similarity_score answers "how close to query" — primary sort signal
// Soft boost for popular/trusted: adds +5 to sort key within same similarity tier
// so popular stores surface higher WITHOUT hiding high-similarity non-popular items
const calcSortKey = (item, sortBy) => {
    if (sortBy === 'price_asc') return item.price || 0;
    if (sortBy === 'popularity') return -(item.similarity_score || 0) - (item.is_popular ? 5 : 0);
    // default: similarity desc (highest first) + popular soft boost
    return -(item.similarity_score || 0) - (item.is_popular ? 5 : 0);
};

// Match classification order for section grouping (per requirements)
const MATCH_ORDER = { EXACT_MATCH: 0, VARIANT_MATCH: 1, SIMILAR: 2 };

const SearchPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // ── State ──────────────────────────────────────────────────────────────────
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchData, setSearchData] = useState(null);     // null = pre-search
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [partialDismissed, setPartialDismissed] = useState(false);

    // Filter / sort state
    const [filterType, setFilterType] = useState('popular');  // 'popular' | 'all'
    const [sortBy, setSortBy] = useState('similarity');        // 'similarity' | 'price_asc' | 'popularity'
    const [priceRange, setPriceRange] = useState([0, 50000]);
    const [inStockOnly, setInStockOnly] = useState(false);
    const [selectedStores, setSelectedStores] = useState([]);

    // viewMode comes from the API response — not inferred locally
    // "default" | "brand" | "category"
    const viewMode = searchData?.viewMode || 'default';
    const isBrandView = viewMode === 'brand';
    const [brandContext, setBrandContext] = useState(null); // { name, url, logo }

    // ── URL param sync ─────────────────────────────────────────────────────────
    useEffect(() => {
        const type = searchParams.get('type');      // 'query' | 'url' | 'brand' | 'category'
        const q = searchParams.get('q');
        const url = searchParams.get('url');
        const brand = searchParams.get('brand');
        const brandUrl = searchParams.get('brandUrl');
        const category = searchParams.get('category');

        if (type === 'url' && url) {
            // URL search — dedicated backend flow (scrape → canonical → compare)
            setBrandContext(null);
            doSearch({ type: 'url', url });
        } else if (type === 'brand' && brand) {
            // Brand click — uses brand URL for URL-based search
            const brandObj = FEATURED_BRANDS.find(b => b.name === brand) || { name: brand, url: brandUrl || '' };
            setBrandContext(brandObj);
            doSearch({ type: 'brand', brandId: brandObj.id || brand, q: brand });
        } else if (type === 'category' && category) {
            setBrandContext(null);
            doSearch({ type: 'category', categoryId: category, q: searchParams.get('q') || category });
        } else if (q) {
            setQuery(q);
            setBrandContext(null);
            doSearch({ type: 'query', q });
        } else {
            // Pre-search state
            setSearchData(null);
            setBrandContext(null);
            setQuery('');
        }
    }, [searchParams]);

    // ── Unified search handler ─────────────────────────────────────────────────
    // All entry points use a single POST /discovery/search with a { type, ... } body.
    // This matches §5.1 of the architecture spec and simplifies caching.
    const doSearch = async (body) => {
        setLoading(true);
        setError(null);
        setPartialDismissed(false);
        setFilterType('popular');
        setSortBy('similarity');

        try {
            if (USE_MOCK) {
                await new Promise(r => setTimeout(r, 800));
                setSearchData(MOCK_SEARCH_RESULTS);
            } else {
                let payload = { ...body };

                // Image search sends base64 directly in the JSON, not multipart
                if (body.type === 'image' && body.file) {
                    const base64 = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(body.file);
                    });
                    payload = { type: 'image', image: base64 };
                }

                const res = await axios.post(`${API_BASE}/discovery/search`, payload);
                setSearchData(res.data);
            }
        } catch (err) {
            setError(err.message || 'Search failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── Navigation helpers (set typed URL params) ──────────────────────────────
    const handleTextSearch = (q) => navigate(`/search?type=query&q=${encodeURIComponent(q)}`);
    const handleURLSearch = (url) => navigate(`/search?type=url&url=${encodeURIComponent(url)}`);
    const handleImageSearch = (file) => {
        setQuery('');
        setBrandContext(null);
        doSearch({ type: 'image', file });
    };

    // ── Filter & sort ──────────────────────────────────────────────────────────
    const applyFilters = (items) => {
        if (!items) return [];
        return items.filter(item => {
            if (priceRange && (item.price < priceRange[0] || item.price > priceRange[1])) return false;
            if (inStockOnly && !item.in_stock) return false;
            if (selectedStores.length > 0 && !selectedStores.some(s => item.source?.includes(s))) return false;
            return true;
        });
    };

    const sortItems = (items) => {
        return [...items].sort((a, b) => calcSortKey(a, sortBy) - calcSortKey(b, sortBy));
    };

    const allItems = searchData?.results?.items || [];

    // "Popular & Trusted" = SOFT BOOST, not hard filter.
    // All items are shown — popular/trusted items float higher via calcSortKey.
    // This prevents hiding high-similarity results from smaller (but topic-accurate) stores.
    const displayItems = sortItems(applyFilters(allItems));
    const totalCount = displayItems.length;
    const isPreSearch = !loading && !searchData;

    // For Brand View, default sort is price low-to-high per spec
    useEffect(() => {
        if (isBrandView && sortBy === 'similarity') setSortBy('price_asc');
    }, [isBrandView]);

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-white">
            {loading && <Loader message={isBrandView ? `Finding best prices for ${brandContext?.name}...` : 'Searching across verified stores...'} />}

            <Navbar
                query={query}
                setQuery={setQuery}
                onTextSearch={handleTextSearch}
                onURLSearch={handleURLSearch}
                onImageSearch={handleImageSearch}
                onDrawerOpen={() => setDrawerOpen(true)}
            />
            <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

            {/* ERROR */}
            {error && (
                <div className="max-w-4xl mx-auto px-4 mt-6">
                    <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3">
                        <X size={18} />
                        {error}
                        <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600"><X size={16} /></button>
                    </div>
                </div>
            )}

            {/* ── PRE-SEARCH ───────────────────────────────────────────────────────── */}
            {isPreSearch && (
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12 animate-fade-in">
                    <CategoryTiles />
                    <FeaturedBrands />
                </main>
            )}

            {/* ── RESULTS ─────────────────────────────────────────────────────────── */}
            {searchData && !loading && (
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">

                    {/* PARTIAL RESULTS WARNING — shown when some sources timed out */}
                    {searchData.partial && !partialDismissed && (
                        <div className="mb-4 flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm">
                            <AlertTriangle size={16} className="flex-shrink-0 text-amber-500" />
                            <span>Results may be incomplete — some sources timed out.</span>
                            {searchData.warnings?.length > 0 && (
                                <span className="text-amber-600">({searchData.warnings.join(', ')})</span>
                            )}
                            <button onClick={() => setPartialDismissed(true)} className="ml-auto text-amber-400 hover:text-amber-700">
                                <X size={15} />
                            </button>
                        </div>
                    )}

                    <div className="lg:grid lg:grid-cols-12 lg:gap-8">

                        {/* SIDEBAR */}
                        <aside className="hidden lg:block lg:col-span-3 sticky top-24 h-fit max-h-[calc(100vh-8rem)] overflow-y-auto pr-4 custom-scrollbar">
                            <FilterSidebar
                                priceRange={priceRange}
                                setPriceRange={setPriceRange}
                                inStockOnly={inStockOnly}
                                setInStockOnly={setInStockOnly}
                                selectedStores={selectedStores}
                                setSelectedStores={setSelectedStores}
                            />
                        </aside>

                        {/* RESULTS AREA */}
                        <div className="col-span-12 lg:col-span-9">

                            {/* Results header */}
                            <div className="mb-6">
                                {isBrandView ? (
                                    /* Brand header */
                                    <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center p-1.5 overflow-hidden shadow-sm flex-shrink-0">
                                                <img
                                                    src={brandContext?.logo || `https://logo.clearbit.com/${brandContext?.url?.replace('https://', '').replace('http://', '').split('/')[0]}`}
                                                    alt={brandContext?.name}
                                                    className="w-full h-full object-contain mix-blend-multiply"
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-gray-900">{brandContext?.name}</h2>
                                                {brandContext?.url && (
                                                    <a href={brandContext.url} target="_blank" rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center gap-1">
                                                        Official site <ExternalLink size={11} />
                                                    </a>
                                                )}
                                            </div>
                                            <span className="text-sm text-gray-400 ml-2">({totalCount} items)</span>
                                        </div>
                                        <SortDropdown sortBy={sortBy} setSortBy={setSortBy} />
                                    </div>
                                ) : (
                                    /* Standard results header */
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                                        <div className="flex items-baseline gap-2">
                                            <h2 className="text-xl font-bold text-gray-900">
                                                {viewMode === 'category' && searchParams.get('q')
                                                    ? searchParams.get('q')
                                                    : 'Search Results'}
                                            </h2>
                                            <span className="text-sm text-gray-400">({totalCount} items)</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {/* Trust Filter tabs — "Popular & Trusted" is a DISPLAY LABEL only.
                                                Items are sorted by similarity + popular boost; nothing is hidden. */}
                                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                                <button
                                                    onClick={() => { setFilterType('popular'); setSortBy('similarity'); }}
                                                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${filterType === 'popular' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                                >
                                                    Popular &amp; Trusted
                                                </button>
                                                <button
                                                    onClick={() => { setFilterType('all'); setSortBy('similarity'); }}
                                                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${filterType === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                                >
                                                    All Results
                                                </button>
                                            </div>
                                            <SortDropdown sortBy={sortBy} setSortBy={setSortBy} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* RESULTS GRID */}
                            <div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {displayItems.map((item, idx) => (
                                        <ProductCard key={`${item.id}-${idx}`} product={item} />
                                    ))}
                                </div>
                                {displayItems.length === 0 && <EmptyState />}

                                {/* View More — wired for brand view */}
                                {isBrandView && displayItems.length > 0 && (
                                    <div className="text-center mt-10">
                                        <button className="text-sm font-bold text-blue-600 hover:text-blue-800 border-b-2 border-transparent hover:border-blue-600 pb-1 uppercase tracking-wide transition-all">
                                            View More
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            )}
        </div>
    );
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const SortDropdown = ({ sortBy, setSortBy }) => (
    <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-black bg-white"
    >
        <option value="similarity">Best Match</option>
        <option value="price_asc">Price: Low to High</option>
        <option value="popularity">Popularity</option>
    </select>
);

const EmptyState = () => (
    <div className="text-center py-20 text-gray-400">
        <div className="text-5xl mb-4">🔍</div>
        <p className="font-medium text-lg">No results found</p>
        <p className="text-sm mt-2">Try a different search term or remove some filters</p>
    </div>
);

export default SearchPage;
