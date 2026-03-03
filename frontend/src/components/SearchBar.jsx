import React, { useRef, useState } from 'react';
import { Search, Camera, Menu, Heart, User, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SearchBar = ({ value, onChange, onTextSearch, onURLSearch, onImageSearch, placeholder }) => {
    const fileInputRef = useRef(null);

    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const v = value.trim();
            if (!v) return;
            // Smart detection: if it looks like a URL, route to URL search
            if (/^(https?:\/\/|www\.)/i.test(v)) {
                onURLSearch?.(v);
            } else {
                onTextSearch?.(v);
            }
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const v = value.trim();
        if (!v) return;
        if (/^(https?:\/\/|www\.)/i.test(v)) {
            onURLSearch?.(v);
        } else {
            onTextSearch?.(v);
        }
    };

    const handleFile = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            onImageSearch?.(file);
            e.target.value = ''; // reset so same file can be re-selected
        }
    };

    return (
        <form onSubmit={handleSubmit} className="relative w-full group">
            <div className="relative flex items-center">
                <Search className="absolute left-4 text-gray-400 pointer-events-none" size={20} />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    placeholder={placeholder || 'Search products, paste a URL, or use 📷 for image search'}
                    className="w-full pl-12 pr-14 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 text-sm font-medium focus:outline-none focus:bg-white focus:border-black focus:ring-2 focus:ring-black/10 transition-all shadow-sm hover:shadow-md"
                />
                {/* Clear button */}
                {value && (
                    <button
                        type="button"
                        onClick={() => onChange('')}
                        className="absolute right-12 p-1 text-gray-400 hover:text-gray-700 transition-colors"
                    >
                        <X size={16} />
                    </button>
                )}
                {/* Camera / image upload */}
                <label className="absolute right-3 p-1.5 text-gray-400 hover:text-blue-600 cursor-pointer hover:bg-blue-50 rounded-xl transition-colors">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFile}
                    />
                    <Camera size={20} />
                </label>
            </div>
        </form>
    );
};

export default SearchBar;
