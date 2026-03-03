import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp, Zap, ShieldCheck } from 'lucide-react';

const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease: 'easeOut' },
});

const LandingPage = () => {
    const navigate = useNavigate();

    const benefits = [
        {
            icon: <TrendingUp size={28} className="text-black" />,
            title: 'Real-Time Price Tracking',
            desc: 'Track price history across major retailers to buy at the perfect moment.',
        },
        {
            icon: <Zap size={28} className="text-black" />,
            title: 'Instant Comparison',
            desc: 'Compare prices from Amazon, Flipkart, Instagram, and local shops in one click.',
        },
        {
            icon: <ShieldCheck size={28} className="text-black" />,
            title: 'Smart Recommendations',
            desc: 'AI-powered match quality scoring tells you if a deal is genuine or too good to be true.',
        },
    ];

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans">

            {/* HERO */}
            <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
                {/* Background */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="/homepage 2.png"
                        alt="Fashion background"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                </div>

                {/* Top-right Sign In */}
                <div className="absolute top-0 right-0 p-8 z-20">
                    <button className="text-white/80 font-medium hover:text-white transition-colors text-sm">
                        Sign In
                    </button>
                </div>

                {/* Logo top-left */}
                <div className="absolute top-0 left-0 p-8 z-20 flex items-center gap-2">
                    <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white text-xl shadow-lg">
                        K
                    </div>
                    <span className="text-white font-bold text-xl tracking-tight">KitneKa</span>
                </div>

                {/* Hero Content */}
                <div className="relative z-10 text-center text-white px-6 max-w-4xl mx-auto"
                    style={{ textShadow: '0 2px 12px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.9)' }}
                >
                    <motion.div {...fadeUp(0)} className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-8">
                        <span className="flex h-2 w-2">
                            <span className="animate-ping absolute h-2 w-2 rounded-full bg-white opacity-75"></span>
                            <span className="relative h-2 w-2 rounded-full bg-white"></span>
                        </span>
                        <span className="text-xs font-bold tracking-widest uppercase" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}>The Smart Way to Shop in India</span>
                    </motion.div>

                    <motion.h1
                        {...fadeUp(0.1)}
                        className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6"
                        style={{ textShadow: 'none', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.65))' }}
                    >
                        Right Price.{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-100">
                            Right Store.
                        </span>
                    </motion.h1>

                    <motion.p {...fadeUp(0.2)} className="text-lg md:text-xl text-white mb-12 max-w-2xl mx-auto font-medium leading-relaxed"
                        style={{ textShadow: '0 2px 10px rgba(0,0,0,0.95)' }}
                    >
                        Stop overpaying. Compare prices across online giants, Instagram sellers, and your local neighbourhood stores — instantly.
                    </motion.p>

                    <motion.div {...fadeUp(0.3)} className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                        <button
                            onClick={() => navigate('/search')}
                            className="px-8 py-4 bg-white text-gray-900 rounded-2xl font-bold hover:bg-gray-100 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 flex items-center gap-2 text-base"
                        >
                            Get Started <ArrowRight size={18} />
                        </button>
                        <button
                            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                            className="px-8 py-4 bg-transparent border-2 border-white/40 text-white rounded-2xl font-medium hover:border-white hover:bg-white/10 transition-all text-base"
                        >
                            See how it works
                        </button>
                    </motion.div>
                </div>
            </section>

            {/* BENEFITS */}
            <section id="how-it-works" className="py-24 bg-gray-50">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <div className="inline-block px-3 py-1 bg-black text-white text-xs font-bold tracking-widest uppercase rounded-full mb-4">
                            Why KitneKa?
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Smart Shopping, Simplified.</h2>
                        <p className="text-gray-500 max-w-xl mx-auto">We bring the entire market to your fingertips.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {benefits.map((b, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 transition-all group"
                            >
                                <div className="bg-gray-50 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-gray-100 transition-colors">
                                    {b.icon}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">{b.title}</h3>
                                <p className="text-gray-500 leading-relaxed text-sm">{b.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 bg-white">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="bg-gray-900 rounded-[2.5rem] p-10 md:p-20 text-center text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
                        <div className="relative z-10 max-w-2xl mx-auto">
                            <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">Ready to stop overpaying?</h2>
                            <p className="text-gray-400 text-lg mb-10">Join smart shoppers who save money on every purchase.</p>
                            <button
                                onClick={() => navigate('/search')}
                                className="px-10 py-4 bg-white text-gray-900 rounded-2xl font-bold hover:bg-gray-100 transition-all shadow-xl hover:scale-105"
                            >
                                Start Saving Now
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="bg-gray-50 border-t border-gray-200 py-16">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">K</div>
                                <h3 className="text-xl font-bold text-gray-900">KitneKa</h3>
                            </div>
                            <p className="text-gray-500 text-sm leading-relaxed">Your personal shopping assistant for the best prices online and locally.</p>
                        </div>
                        {[
                            { title: 'Product', links: ['Features', 'Pricing', 'Download App'] },
                            { title: 'Company', links: ['About Us', 'Careers', 'Contact'] },
                            { title: 'Connect', links: ['Twitter', 'Instagram', 'LinkedIn'] },
                        ].map((col) => (
                            <div key={col.title}>
                                <h4 className="font-bold text-gray-900 mb-4 text-xs uppercase tracking-wider">{col.title}</h4>
                                <ul className="space-y-3 text-sm text-gray-500">
                                    {col.links.map((link) => (
                                        <li key={link}><a href="#" className="hover:text-gray-900 transition-colors">{link}</a></li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-400 font-medium">
                        <p>© {new Date().getFullYear()} KitneKa. All rights reserved.</p>
                        <div className="flex gap-6">
                            <a href="#" className="hover:text-gray-600">Privacy Policy</a>
                            <a href="#" className="hover:text-gray-600">Terms of Service</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
