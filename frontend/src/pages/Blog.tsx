import { Footer } from "@/components/landing/Footer";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { blogPosts } from "@/data/blogPosts";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Blog() {
    const navigate = useNavigate();
    const [activeCategory, setActiveCategory] = useState('All');

    const categories = ['All', 'AI & Education', 'Product Updates', 'Education', 'Security', 'Case Studies', 'Student Tips'];

    const filteredPosts = activeCategory === 'All'
        ? blogPosts
        : blogPosts.filter(post => post.category === activeCategory);

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors duration-300">
            <LandingHeader />

            <main className="pt-32 pb-20 px-6 lg:px-8 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none h-[500px]" />
                <div className="max-w-7xl mx-auto relative">
                    {/* Header */}
                    <div className="text-center mb-16">
                        <h1 className="text-6xl font-bold text-slate-900 dark:text-white mb-6">Our <span className="text-emerald-600">Blog</span></h1>
                        <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
                            Insights, updates, and stories from the world of AI-powered education
                        </p>
                    </div>

                    {/* Categories */}
                    <div className="flex flex-wrap gap-3 justify-center mb-12">
                        {categories.map((category, index) => (
                            <button
                                key={index}
                                onClick={() => setActiveCategory(category)}
                                className={`px-5 py-2 rounded-lg transition-colors ${activeCategory === category
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                                    }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>

                    {/* Blog Posts Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                        {filteredPosts.map((post) => (
                            <article
                                key={post.id}
                                onClick={() => navigate(`/blog/${post.slug}`)}
                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-xl transition-all cursor-pointer group"
                            >
                                <div className="h-48 overflow-hidden relative">
                                    <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="p-6">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-medium">
                                            {post.category}
                                        </span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">{post.readTime}</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                        {post.title}
                                    </h3>
                                    <p className="text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">{post.excerpt}</p>
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                                        <span className="text-sm text-slate-500 dark:text-slate-500">{post.date}</span>
                                        <span className="text-sm text-emerald-600 dark:text-emerald-400 group-hover:underline">Read more →</span>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>

                    {/* Newsletter Signup */}
                    <div className="bg-emerald-600 rounded-2xl p-12 text-center relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="text-4xl font-bold text-white mb-4">Subscribe to Our Newsletter</h2>
                            <p className="text-xl text-emerald-100 mb-8">Get the latest insights delivered to your inbox</p>
                            <div className="max-w-md mx-auto flex gap-3">
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    className="flex-1 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-white text-slate-900"
                                />
                                <button className="px-6 py-3 bg-white hover:bg-slate-50 text-emerald-600 font-semibold rounded-lg transition-colors">
                                    Subscribe
                                </button>
                            </div>
                        </div>
                        {/* Background decoration */}
                        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                            <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl" />
                            <div className="absolute bottom-10 right-10 w-48 h-48 bg-white rounded-full blur-3xl" />
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
