import React from 'react';
import { Check } from 'lucide-react';
import { POPULAR_STORES } from '../config';

const FilterSidebar = ({ priceRange, setPriceRange, inStockOnly, setInStockOnly, selectedStores, setSelectedStores }) => {
    const toggleStore = (store) => {
        setSelectedStores(prev =>
            prev.includes(store) ? prev.filter(s => s !== store) : [...prev, store]
        );
    };

    return (
        <div className="space-y-8">
            {/* Price Range */}
            <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-4">Price Range</h3>
                <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                    <span>₹{priceRange[0].toLocaleString('en-IN')}</span>
                    <span>₹{priceRange[1].toLocaleString('en-IN')}</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="50000"
                    step="500"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                    className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-black"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Free</span>
                    <span>₹50,000</span>
                </div>
            </div>

            {/* In Stock Only */}
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">In Stock Only</span>
                <button
                    onClick={() => setInStockOnly(!inStockOnly)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${inStockOnly ? 'bg-black' : 'bg-gray-200'}`}
                >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${inStockOnly ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>

            {/* Stores */}
            <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-4">Stores</h3>
                <div className="space-y-3">
                    {POPULAR_STORES.map(store => (
                        <label key={store} className="flex items-center gap-3 cursor-pointer group">
                            <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedStores.includes(store) ? 'bg-black border-black text-white' : 'border-gray-300 group-hover:border-gray-500'}`}
                                onClick={() => toggleStore(store)}
                            >
                                {selectedStores.includes(store) && <Check size={12} />}
                            </div>
                            <span className={`text-sm transition-colors ${selectedStores.includes(store) ? 'font-semibold text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}`}>
                                {store}
                            </span>
                        </label>
                    ))}
                </div>
                {selectedStores.length > 0 && (
                    <button
                        onClick={() => setSelectedStores([])}
                        className="mt-3 text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                        Clear filters
                    </button>
                )}
            </div>
        </div>
    );
};

export default FilterSidebar;
