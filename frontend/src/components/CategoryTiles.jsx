import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES } from '../config';

const CategoryTiles = ({ onSelect }) => {
    const navigate = useNavigate();

    const handleClick = (cat) => {
        if (onSelect) {
            onSelect(cat);
        } else if (cat.category) {
            navigate(`/search?category=${encodeURIComponent(cat.category)}`);
        } else {
            navigate(`/search?q=${encodeURIComponent(cat.query)}`);
        }
    };

    return (
        <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Browse Categories</h2>

            {/*
              2-row horizontal scroll grid — standard UX on Myntra, Ajio, Nykaa.
              CSS grid with grid-auto-flow: column fills top→bottom per column,
              so the row scrolls horizontally as one unit.
            */}
            <div
                className="overflow-x-auto no-scrollbar -mx-4 px-4 pb-2"
            >
                <div
                    style={{
                        display: 'grid',
                        gridTemplateRows: 'repeat(2, 186px)',
                        gridAutoFlow: 'column',
                        gridAutoColumns: '156px',
                        gap: '10px',
                    }}
                >
                    {CATEGORIES.map((cat) =>
                        cat.image ? (
                            /* ── Photo Card ── */
                            <button
                                key={cat.id}
                                onClick={() => handleClick(cat)}
                                className="relative rounded-lg overflow-hidden group cursor-pointer w-full h-full"
                                style={{ outline: 'none' }}
                            >
                                <img
                                    src={cat.image}
                                    alt={cat.name}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    loading="lazy"
                                />
                                {/* gradient for text */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                                {/* Label — bottom-left, Playfair serif, matches Phia style */}
                                <div className="absolute bottom-0 left-0 p-3">
                                    <span
                                        className="text-white leading-tight block drop-shadow-sm"
                                        style={{
                                            fontFamily: "'Playfair Display', Georgia, serif",
                                            fontSize: '15px',
                                            fontWeight: 500,
                                            lineHeight: 1.2,
                                        }}
                                    >
                                        {cat.name}
                                    </span>
                                </div>
                            </button>
                        ) : (
                            /* ── Emoji fallback card ── */
                            <button
                                key={cat.id}
                                onClick={() => handleClick(cat)}
                                className={`relative rounded-lg overflow-hidden group cursor-pointer w-full h-full ${cat.color} flex flex-col items-center justify-center gap-2`}
                            >
                                <span className="text-3xl">{cat.icon}</span>
                                <span
                                    className={`text-xs font-medium text-center px-2 leading-tight ${cat.textColor}`}
                                    style={{ fontFamily: "'Playfair Display', serif" }}
                                >
                                    {cat.name}
                                </span>
                            </button>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default CategoryTiles;
