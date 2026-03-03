import React from 'react';
import { Search } from 'lucide-react';

const Loader = ({ message = 'Searching across verified stores...' }) => (
    <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-[80] flex flex-col items-center justify-center gap-6">
        {/* Animated rings */}
        <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 animate-spin"></div>
            <div className="absolute inset-3 rounded-full border-4 border-t-blue-300 animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <Search size={20} className="text-blue-600" />
            </div>
        </div>
        <div className="text-center">
            <p className="text-gray-700 font-semibold text-lg">{message}</p>
            <p className="text-gray-400 text-sm mt-1">Comparing prices across 27+ stores</p>
        </div>
        {/* Bouncing dots */}
        <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
                <div
                    key={i}
                    className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                />
            ))}
        </div>
    </div>
);

export default Loader;
