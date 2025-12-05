import { Footer } from "@/components/landing/Footer";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Button } from "@/components/ui/button";
import { blogPosts } from "@/data/blogPosts";
import { ArrowLeft, Calendar, Clock, Share2, User } from "lucide-react";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function BlogPost() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const post = blogPosts.find(p => p.slug === slug);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [slug]);

    if (!post) {
        return (
            <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col">
                <LandingHeader />
                <div className="flex-1 flex flex-col items-center justify-center pt-32 px-6 text-center">
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Post Not Found</h1>
                    <p className="text-slate-600 dark:text-slate-400 mb-8">The blog post you are looking for does not exist.</p>
                    <Button onClick={() => navigate('/blog')} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Blog
                    </Button>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors duration-300">
            <LandingHeader />

            <main className="pt-32 pb-20 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none h-[500px]" />
                <div className="relative">
                    {/* Article Header */}
                    <div className="max-w-5xl mx-auto px-6 lg:px-8 mb-12">
                        <Button
                            variant="ghost"
                            onClick={() => navigate('/blog')}
                            className="mb-8 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 pl-0 hover:bg-transparent"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Blog
                        </Button>

                        <div className="flex items-center gap-3 mb-6">
                            <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-medium">
                                {post.category}
                            </span>
                            <span className="text-slate-500 dark:text-slate-500 text-sm flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {post.readTime}
                            </span>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
                            {post.title}
                        </h1>

                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold">
                                    <User className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-medium text-slate-900 dark:text-white">{post.author}</div>
                                    <div className="text-sm text-slate-500 dark:text-slate-500 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> {post.date}
                                    </div>
                                </div>
                            </div>
                            <Button variant="outline" size="icon" className="rounded-full">
                                <Share2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Featured Image */}
                    <div className="max-w-5xl mx-auto px-6 lg:px-8 mb-16">
                        <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl">
                            <img
                                src={post.image}
                                alt={post.title}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                            />
                        </div>
                    </div>

                    {/* Article Content */}
                    <article className="max-w-5xl mx-auto px-6 lg:px-8">
                        <div
                            className="prose prose-lg dark:prose-invert prose-emerald max-w-none
              prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-900 dark:prose-headings:text-white
              prose-h1:text-4xl prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6
              prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-4
              prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-6
              prose-a:text-emerald-600 dark:prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline prose-a:font-medium
              prose-strong:text-slate-900 dark:prose-strong:text-white prose-strong:font-bold
              prose-ul:list-disc prose-ul:pl-6 prose-ul:my-6
              prose-ol:list-decimal prose-ol:pl-6 prose-ol:my-6
              prose-li:text-slate-600 dark:prose-li:text-slate-300 prose-li:mb-2
              prose-blockquote:border-l-4 prose-blockquote:border-emerald-500 prose-blockquote:pl-6 prose-blockquote:py-2 prose-blockquote:my-8 prose-blockquote:italic prose-blockquote:text-slate-700 dark:prose-blockquote:text-slate-300 prose-blockquote:bg-slate-50 dark:prose-blockquote:bg-slate-900/50 prose-blockquote:rounded-r-lg
              prose-img:rounded-xl prose-img:shadow-lg prose-img:my-8"
                            dangerouslySetInnerHTML={{ __html: post.content }}
                        />
                    </article>

                    {/* Newsletter CTA */}
                    <div className="max-w-4xl mx-auto px-6 lg:px-8 mt-20">
                        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 md:p-12 text-center">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Enjoyed this article?</h3>
                            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-lg mx-auto">
                                Subscribe to our newsletter to get the latest insights on AI in education delivered straight to your inbox.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    className="flex-1 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 h-auto">
                                    Subscribe
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
