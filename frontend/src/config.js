export const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

// Featured Brands
export const FEATURED_BRANDS = [
    { id: 'fabindia', name: 'FabIndia', logo: 'https://logo.clearbit.com/fabindia.com', tag: 'Ethnic', url: 'https://www.fabindia.com' },
    { id: 'manyavar', name: 'Manyavar', logo: 'https://logo.clearbit.com/manyavar.com', tag: 'Celebrations', url: 'https://www.manyavar.com' },
    { id: 'biba', name: 'Biba', logo: 'https://logo.clearbit.com/biba.in', tag: 'Trending', url: 'https://www.biba.in' },
    { id: 'raymond', name: 'Raymond', logo: 'https://logo.clearbit.com/raymond.in', tag: 'Premium', url: 'https://www.raymond.in' },
    { id: 'titan', name: 'Titan', logo: 'https://logo.clearbit.com/titan.co.in', tag: 'Timeless', url: 'https://www.titan.co.in' },
    { id: 'nike', name: 'Nike', logo: 'https://logo.clearbit.com/nike.com', tag: 'Sport', url: 'https://www.nike.com/in' },
    { id: 'adidas', name: 'Adidas', logo: 'https://logo.clearbit.com/adidas.co.in', tag: 'Active', url: 'https://www.adidas.co.in' },
    { id: 'hm', name: 'H&M', logo: 'https://logo.clearbit.com/hm.com', tag: 'Fashion', url: 'https://www2.hm.com/en_in' },
    { id: 'zara', name: 'Zara', logo: 'https://logo.clearbit.com/zara.com', tag: 'Chic', url: 'https://www.zara.com/in' },
    { id: 'puma', name: 'Puma', logo: 'https://logo.clearbit.com/puma.com', tag: 'Fast', url: 'https://in.puma.com' },
    { id: 'lakme', name: 'Lakme', logo: 'https://logo.clearbit.com/lakmeindia.com', tag: 'Beauty', url: 'https://www.lakmeindia.com' },
    { id: 'sephora', name: 'Sephora', logo: 'https://logo.clearbit.com/sephora.com', tag: 'Luxury', url: 'https://www.sephora.in' },
];

// Categories
export const CATEGORIES = [
    { id: 'womens', name: "Women's Wear", image: "/women's wear .png", query: 'Women Clothing', icon: '👗', color: 'bg-pink-100', textColor: 'text-pink-700' },
    { id: 'mens', name: "Men's Wear", image: "/Men's wear .png", query: 'Men Clothing', icon: '👔', color: 'bg-blue-100', textColor: 'text-blue-700' },
    { id: 'kids', name: 'Kidswear', image: '/Kidswear .png', query: 'Kids Clothing', icon: '🧒', color: 'bg-yellow-100', textColor: 'text-yellow-700' },
    { id: 'sport', name: 'Sportswear', image: '/Sportswear .png', query: 'Sportswear', icon: '🏃', color: 'bg-green-100', textColor: 'text-green-700' },
    { id: 'footwear', name: 'Footwear', image: '/Footwear .png', query: 'Women Footwear', icon: '👟', color: 'bg-orange-100', textColor: 'text-orange-700' },
    { id: 'jewellery', name: 'Jewellery', image: '/Jewellery .png', query: 'Jewellery Sets', icon: '💎', color: 'bg-indigo-100', textColor: 'text-indigo-700' },
    { id: 'accessories', name: 'Accessories', image: '/Accessories .png', query: 'Fashion Accessories', icon: '👜', color: 'bg-rose-100', textColor: 'text-rose-700' },
    { id: 'beauty', name: 'Beauty', image: '/Beauty .png', query: 'Beauty Products', icon: '✨', color: 'bg-purple-100', textColor: 'text-purple-700' },
    { id: 'watches', name: 'Watches', image: '/categories/Watches.png', query: 'Watches for Women', icon: '⌚', color: 'bg-gray-100', textColor: 'text-gray-700' },
    { id: 'clean-beauty', name: 'Clean Beauty', image: '/categories/Clean Beauty.png', category: 'Clean Beauty', icon: '🌿', color: 'bg-emerald-100', textColor: 'text-emerald-700' },
];

// Trusted stores list
export const POPULAR_STORES = ['Amazon', 'Flipkart', 'Myntra', 'Ajio', 'Nykaa', 'Tata Cliq'];
