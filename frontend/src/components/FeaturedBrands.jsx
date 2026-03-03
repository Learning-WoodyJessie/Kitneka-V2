import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FEATURED_BRANDS } from '../config';

const FeaturedBrands = ({ onSelect }) => {
    const navigate = useNavigate();

    const handleClick = (brand) => {
        if (onSelect) {
            onSelect(brand);
        } else {
            navigate(`/search?brand=${encodeURIComponent(brand.name)}&url=${encodeURIComponent(brand.url)}`);
        }
    };

    return (
        <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Featured Brands</h2>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
                {FEATURED_BRANDS.map((brand) => (
                    <button
                        key={brand.id}
                        onClick={() => handleClick(brand)}
                        className="flex flex-col items-center gap-2 flex-shrink-0 group"
                    >
                        <div className="w-16 h-16 rounded-full border-2 border-gray-100 bg-white flex items-center justify-center p-2.5 shadow-sm group-hover:border-blue-400 group-hover:shadow-md transition-all overflow-hidden">
                            <img
                                src={brand.logo}
                                alt={brand.name}
                                className="w-full h-full object-contain mix-blend-multiply"
                                onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(brand.name)}&background=f0f0f0&color=333&size=128`; }}
                            />
                        </div>
                        <div className="flex flex-col items-center gap-0.5">
                            <span className="text-xs font-semibold text-gray-800 group-hover:text-black">{brand.name}</span>
                            <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{brand.tag}</span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default FeaturedBrands;
