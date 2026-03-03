import React from 'react';
import { Heart, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// similarity_score answers "how close to what you searched for" — the right value to show as "% match"
// confidence_score is data quality; shown only on the product detail page
const SimilarityBadge = ({ score }) => {
    if (score == null) return null;
    const color =
        score >= 85 ? 'bg-green-500/90 text-white' :
            score >= 65 ? 'bg-amber-400/90 text-white' :
                'bg-gray-500/80 text-white';
    return (
        <div className={`absolute bottom-2 left-2 text-[10px] font-bold px-2 py-1 rounded-md shadow backdrop-blur-sm ${color}`}>
            {score}% match
        </div>
    );
};

const ProductCard = ({ product }) => {
    const navigate = useNavigate();

    const handleClick = () => {
        localStorage.setItem(`product_${product.id}`, JSON.stringify(product));
        navigate(`/product/${product.id}`);
    };

    return (
        <div
            onClick={handleClick}
            className="group relative bg-white rounded-2xl border border-gray-100 hover:border-black/10 hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden"
        >
            {/* Image */}
            <div className="aspect-[3/4] bg-gray-50 relative overflow-hidden">
                <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                    onError={(e) => {
                        e.target.src = `https://via.placeholder.com/300x400/f0f0f0/999?text=${encodeURIComponent(product.source || 'KitneKa')}`;
                    }}
                />

                {/* Similarity score badge — bottom left; answers "how close to your search" */}
                <SimilarityBadge score={product.similarity_score} />

                {/* Hover action buttons — top right */}
                <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                        className="p-1.5 bg-white/90 backdrop-blur-sm rounded-full text-gray-400 hover:text-red-500 hover:bg-white transition-colors shadow-sm"
                        onClick={(e) => { e.stopPropagation(); }}
                        aria-label="Add to wishlist"
                    >
                        <Heart size={15} />
                    </button>
                    <button
                        className="p-1.5 bg-white/90 backdrop-blur-sm rounded-full text-gray-400 hover:text-green-500 hover:bg-white transition-colors shadow-sm"
                        onClick={(e) => { e.stopPropagation(); }}
                        aria-label="Like"
                    >
                        <ThumbsUp size={15} />
                    </button>
                    <button
                        className="p-1.5 bg-white/90 backdrop-blur-sm rounded-full text-gray-400 hover:text-gray-900 hover:bg-white transition-colors shadow-sm"
                        onClick={(e) => { e.stopPropagation(); }}
                        aria-label="Dislike"
                    >
                        <ThumbsDown size={15} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-3.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{product.source}</span>
                <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mt-0.5 mb-2 leading-snug group-hover:text-black">
                    {product.title}
                </h3>
                <div className="flex items-baseline gap-2">
                    <span className="text-base font-bold text-gray-900">₹{product.price?.toLocaleString('en-IN')}</span>
                    {product.original_price && product.original_price > product.price && (
                        <span className="text-xs text-gray-400 line-through">₹{product.original_price?.toLocaleString('en-IN')}</span>
                    )}
                    {product.original_price && product.original_price > product.price && (
                        <span className="text-xs font-bold text-green-600">
                            {Math.round((1 - product.price / product.original_price) * 100)}% off
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductCard;
