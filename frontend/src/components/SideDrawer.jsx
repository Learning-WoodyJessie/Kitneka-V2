import React from 'react';
import { X, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES, FEATURED_BRANDS } from '../config';

const SideDrawer = ({ open, onClose }) => {
    const navigate = useNavigate();

    const handleCategory = (cat) => {
        onClose();
        if (cat.category) {
            navigate(`/search?category=${encodeURIComponent(cat.category)}`);
        } else {
            navigate(`/search?q=${encodeURIComponent(cat.query)}`);
        }
    };

    const handleBrand = (brand) => {
        onClose();
        navigate(`/search?brand=${encodeURIComponent(brand.name)}&url=${encodeURIComponent(brand.url)}`);
    };

    return (
        <>
            {/* Backdrop */}
            {open && (
                <div
                    className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm"
                    onClick={onClose}
                />
            )}

            {/* Drawer panel */}
            <div
                className={`fixed inset-y-0 left-0 w-72 bg-white shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out flex flex-col ${open ? 'translate-x-0' : '-translate-x-full'}`}
            >
                {/* Header */}
                <div className="bg-black text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2 font-bold text-lg">
                        <div className="bg-white/20 px-1.5 py-0.5 rounded-md text-base">K</div>
                        KitneKa
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto">
                    {/* Categories */}
                    <div className="py-4">
                        <div className="px-5 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                            Shop By Category
                        </div>
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => handleCategory(cat)}
                                className="w-full text-left px-5 py-3 text-gray-700 hover:bg-gray-50 hover:text-black font-medium text-sm transition-colors flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`w-8 h-8 rounded-xl ${cat.color} flex items-center justify-center text-base`}>
                                        {cat.icon}
                                    </span>
                                    {cat.name}
                                </div>
                                <ChevronRight size={16} className="text-gray-300 group-hover:text-black transition-colors" />
                            </button>
                        ))}
                    </div>

                    {/* Featured Brands */}
                    <div className="px-5 py-4 border-t border-gray-100 mb-4">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Featured Brands</div>
                        <div className="grid grid-cols-3 gap-3">
                            {FEATURED_BRANDS.map((brand) => (
                                <button
                                    key={brand.id}
                                    onClick={() => handleBrand(brand)}
                                    className="flex flex-col items-center gap-1.5 group"
                                >
                                    <div className="w-14 h-14 rounded-full border-2 border-gray-100 bg-white flex items-center justify-center p-2 shadow-sm group-hover:border-blue-400 group-hover:shadow-md transition-all overflow-hidden">
                                        <img
                                            src={brand.logo}
                                            alt={brand.name}
                                            className="w-full h-full object-contain mix-blend-multiply"
                                            onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${brand.name}&background=random`; }}
                                        />
                                    </div>
                                    <span className="text-xs font-medium text-center text-gray-600 group-hover:text-black truncate w-full text-center">
                                        {brand.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 flex-shrink-0">
                    <button className="text-sm text-gray-500 hover:text-black font-medium transition-colors">
                        Help & Support
                    </button>
                </div>
            </div>
        </>
    );
};

export default SideDrawer;
