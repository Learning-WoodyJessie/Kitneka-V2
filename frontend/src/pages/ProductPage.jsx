import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, AlertTriangle, Info, ArrowLeft, Heart, ThumbsUp, ThumbsDown, ExternalLink, Check, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { MOCK_PRODUCT } from '../mockData';

const VERDICT_CONFIG = {
    'GREAT BUY': { label: 'GREAT BUY', color: 'bg-green-500', textColor: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', icon: <TrendingDown size={16} /> },
    'GOOD DEAL': { label: 'GOOD DEAL', color: 'bg-emerald-500', textColor: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: <Check size={16} /> },
    'CAUTION': { label: 'CAUTION', color: 'bg-amber-400', textColor: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: <AlertTriangle size={16} /> },
    'NEUTRAL': { label: 'NEUTRAL', color: 'bg-blue-500', textColor: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: <Info size={16} /> },
};

const StarRating = ({ rating }) => (
    <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} size={14}
                className={s <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
        ))}
    </div>
);

// Confidence score = data quality + match confidence across stores.
// Shown near the title to tell the user "how sure we are this listing represents the product".
const ConfidenceChip = ({ score }) => {
    if (score == null) return null;
    const color = score >= 85 ? 'text-green-700 bg-green-50 border-green-200'
        : score >= 65 ? 'text-amber-700 bg-amber-50 border-amber-200'
            : 'text-gray-600 bg-gray-50 border-gray-200';
    return (
        <span
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${color}`}
            title="How closely this listing matches the product across stores."
        >
            Match confidence: {score}%
        </span>
    );
};

const ProductPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [offersTab, setOffersTab] = useState('top'); // 'top' | 'other'

    useEffect(() => {
        const stored = localStorage.getItem(`product_${id}`);
        if (stored) {
            const p = JSON.parse(stored);
            setProduct({ ...MOCK_PRODUCT, ...p, id, offers: MOCK_PRODUCT.offers, price_history: MOCK_PRODUCT.price_history, similar: MOCK_PRODUCT.similar });
        } else {
            setProduct(MOCK_PRODUCT);
        }
    }, [id]);

    if (!product) return null;

    const verdict = VERDICT_CONFIG[product.ai_verdict] || VERDICT_CONFIG['NEUTRAL'];
    const topOffers = product.offers?.filter(o => o.is_popular || o.is_official) || [];
    const otherOffers = product.offers?.filter(o => !o.is_popular && !o.is_official) || [];
    const discount = product.market_avg && product.best_price
        ? Math.round((1 - product.best_price / product.market_avg) * 100)
        : 0;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0">
                        <ArrowLeft size={20} className="text-gray-600" />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-base">K</div>
                        <span className="font-bold text-gray-900">KitneKa</span>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Product Header: 2 cols */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">

                    {/* LEFT — Product Image */}
                    <div className="space-y-4">
                        <div className="relative bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden aspect-square flex items-center justify-center p-8">
                            {product.rating > 4.5 && (
                                <div className="absolute top-4 left-4 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow">
                                    ⭐ Top Rated
                                </div>
                            )}
                            <img src={product.image} alt={product.title} className="w-full h-full object-contain" />
                        </div>
                        {/* Like/Wishlist/Dislike */}
                        <div className="flex gap-3">
                            <button className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-gray-200 rounded-2xl text-sm font-semibold text-gray-600 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all">
                                <Heart size={18} /> Wishlist
                            </button>
                            <button className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-gray-200 rounded-2xl text-sm font-semibold text-gray-600 hover:border-green-300 hover:text-green-500 hover:bg-green-50 transition-all">
                                <ThumbsUp size={18} /> Like
                            </button>
                            <button className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-gray-200 rounded-2xl text-sm font-semibold text-gray-600 hover:border-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all">
                                <ThumbsDown size={18} /> Dislike
                            </button>
                        </div>
                    </div>

                    {/* RIGHT — Product Details */}
                    <div className="space-y-6">

                        {/* Brand + Category + Confidence */}
                        <div>
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">{product.brand}</span>
                                <span className="text-gray-300">·</span>
                                <span className="text-xs text-gray-400">{product.category}</span>
                                {/* Confidence chip — answers "how sure are we this is the right product" */}
                                <ConfidenceChip score={product.confidence_score} />
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-snug">{product.title}</h1>
                        </div>

                        {/* Rating + stock */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <StarRating rating={product.rating} />
                                <span className="text-sm font-bold text-gray-700">{product.rating}</span>
                                <span className="text-sm text-gray-400">({product.review_count?.toLocaleString('en-IN')} reviews)</span>
                            </div>
                            <div className={`text-xs font-bold px-2 py-1 rounded-full ${product.in_stock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                {product.in_stock ? 'In Stock' : 'Out of Stock'}
                            </div>
                        </div>

                        {/* Best Market Price */}
                        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Best Market Price</p>
                            <div className="flex items-baseline gap-3 mb-1">
                                <span className="text-4xl font-bold text-gray-900">₹{product.best_price?.toLocaleString('en-IN')}</span>
                                {product.market_avg && product.market_avg > product.best_price && (
                                    <span className="text-lg text-gray-400 line-through">₹{product.market_avg?.toLocaleString('en-IN')}</span>
                                )}
                                {discount > 0 && (
                                    <span className="text-lg font-bold text-green-600">{discount}% off</span>
                                )}
                            </div>
                            <p className="text-sm text-green-600 font-medium mb-4">Lowest at {product.best_store}</p>
                            <a
                                href={product.offers?.[0]?.url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full bg-black text-white py-3.5 rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                                Go to Store <ExternalLink size={16} />
                            </a>
                        </div>

                        {/* AI Recommendation */}
                        <div className={`${verdict.bg} border ${verdict.border} rounded-2xl p-5`}>
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`${verdict.color} text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5`}>
                                    {verdict.icon}
                                    {verdict.label}
                                </div>
                                <span className="text-xs font-bold text-gray-400">AI Analysis</span>
                            </div>
                            <p className={`text-sm font-medium ${verdict.textColor} leading-relaxed`}>{product.ai_text}</p>
                        </div>
                    </div>
                </div>

                {/* OFFERS TABLE */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm mb-10 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Compare Prices</h2>
                        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                            <button
                                onClick={() => setOffersTab('top')}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${offersTab === 'top' ? 'bg-white text-black shadow-sm' : 'text-gray-500'}`}
                            >
                                Top Retailers
                            </button>
                            <button
                                onClick={() => setOffersTab('other')}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${offersTab === 'other' ? 'bg-white text-black shadow-sm' : 'text-gray-500'}`}
                            >
                                Other Options
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 text-left">
                                    <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Seller</th>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Price</th>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">
                                        {/* Match% tooltip: how closely this seller's listing matches the product */}
                                        <abbr title="How closely this seller's listing matches the product" className="no-underline cursor-help">
                                            Match%
                                        </abbr>
                                    </th>
                                    <th className="px-6 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {(offersTab === 'top' ? topOffers : otherOffers).map((offer, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <span className="font-semibold text-gray-900 text-sm">{offer.store}</span>
                                                {offer.is_best && (
                                                    <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">BEST DEAL</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-base font-bold text-gray-900">₹{offer.price?.toLocaleString('en-IN')}</span>
                                                {offer.original_price && offer.original_price > offer.price && (
                                                    <span className="text-xs text-gray-400 line-through">₹{offer.original_price?.toLocaleString('en-IN')}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell">
                                            <span className="text-sm text-gray-600">{offer.match_pct}%</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <a
                                                href={offer.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${offer.is_best ? 'bg-black text-white hover:bg-gray-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                            >
                                                Buy Now
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* PRICE HISTORY */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm mb-10 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Price History</h2>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={product.price_history}>
                                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} width={60} />
                                <Tooltip
                                    formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Price']}
                                    contentStyle={{ borderRadius: 12, border: '1px solid #f0f0f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                                />
                                <Line type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* SIMILAR PRODUCTS */}
                <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-5">Similar Products</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {product.similar?.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => navigate(`/product/${item.id}`)}
                                className="bg-white rounded-2xl border border-gray-100 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer overflow-hidden group"
                            >
                                <div className="aspect-[3/4] bg-gray-50 overflow-hidden">
                                    <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                </div>
                                <div className="p-3">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.source}</p>
                                    <p className="text-xs text-gray-800 font-medium line-clamp-2 mt-0.5">{item.title}</p>
                                    <p className="text-sm font-bold text-gray-900 mt-1">₹{item.price?.toLocaleString('en-IN')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductPage;
