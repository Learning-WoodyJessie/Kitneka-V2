import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Heart, User } from 'lucide-react';
import SearchBar from './SearchBar';

const Navbar = ({ query, setQuery, onTextSearch, onURLSearch, onImageSearch, onDrawerOpen, showSearch = true }) => {
    const navigate = useNavigate();

    return (
        <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-3 md:gap-6 h-16 md:h-18">

                    {/* Logo */}
                    <Link
                        to="/search"
                        className="flex items-center gap-2 flex-shrink-0 group"
                        onClick={() => { setQuery?.(''); }}
                    >
                        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white text-xl shadow-md group-hover:bg-blue-700 transition-colors">
                            K
                        </div>
                        <span className="text-xl font-bold text-gray-900 tracking-tight hidden sm:block group-hover:text-blue-600 transition-colors">
                            KitneKa
                        </span>
                    </Link>

                    {/* All Categories button */}
                    <button
                        onClick={onDrawerOpen}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-black hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0"
                    >
                        <Menu size={18} />
                        <span className="hidden md:block">All Categories</span>
                    </button>

                    {/* Search Bar — takes remaining space */}
                    {showSearch && (
                        <div className="flex-1 min-w-0">
                            <SearchBar
                                value={query}
                                onChange={setQuery}
                                onTextSearch={onTextSearch}
                                onURLSearch={onURLSearch}
                                onImageSearch={onImageSearch}
                            />
                        </div>
                    )}

                    {/* Right actions */}
                    <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                        <button className="hidden md:flex flex-col items-center gap-0.5 group px-2 py-1 rounded-xl hover:bg-gray-50 transition-colors">
                            <User size={20} className="text-gray-500 group-hover:text-black transition-colors" />
                            <span className="text-[10px] font-semibold text-gray-500 group-hover:text-black">Sign In</span>
                        </button>
                        <button className="flex flex-col items-center gap-0.5 group relative px-2 py-1 rounded-xl hover:bg-gray-50 transition-colors">
                            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                            <Heart size={20} className="text-gray-500 group-hover:text-red-500 transition-colors" />
                            <span className="text-[10px] font-semibold text-gray-500 group-hover:text-red-500 hidden md:block">Wishlist</span>
                        </button>
                    </div>

                </div>
            </div>
        </header>
    );
};

export default Navbar;
