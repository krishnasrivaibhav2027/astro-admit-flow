
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { ExternalLink, FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

const Apply = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [formUrl, setFormUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchFormUrl();
    }, []);

    const fetchFormUrl = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/institutions/access-form`);

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || "Failed to get form");
            }

            const data = await response.json();
            setFormUrl(data.form_url);
        } catch (err: any) {
            console.error("Error fetching form URL:", err);
            setError(err.message);
            toast({
                title: "Error",
                description: "Failed to load access request form. Please try again.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenForm = () => {
        if (formUrl) {
            window.open(formUrl, '_blank');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-slate-950">
            <LandingHeader />

            <div className="flex items-center justify-center min-h-screen pt-24 pb-12 px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md text-center"
                >
                    {/* Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 p-8">

                        {/* Icon */}
                        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
                            <FileText className="w-10 h-10 text-white" />
                        </div>

                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                            Request Access
                        </h1>

                        <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                            Fill out the access request form to apply for admission assessment access at your institution.
                        </p>

                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                            </div>
                        ) : error ? (
                            <div className="space-y-4">
                                <p className="text-red-500 text-sm">{error}</p>
                                <Button
                                    onClick={fetchFormUrl}
                                    variant="outline"
                                    className="border-emerald-500 text-emerald-600"
                                >
                                    Try Again
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <Button
                                    onClick={handleOpenForm}
                                    className="w-full py-6 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/20 transition-all"
                                >
                                    Open Request Form
                                    <ExternalLink className="w-5 h-5 ml-2" />
                                </Button>

                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Opens Google Form in a new tab
                                </p>
                            </div>
                        )}

                        {/* What happens next */}
                        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">What happens next?</h3>
                            <ol className="text-left text-sm text-gray-600 dark:text-gray-400 space-y-2">
                                <li className="flex items-start gap-2">
                                    <span className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
                                    Fill out the Google Form
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
                                    Your institution reviews your request
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
                                    You'll receive an email with login instructions
                                </li>
                            </ol>
                        </div>
                    </div>

                    {/* Footer link */}
                    <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
                        Already have access?{' '}
                        <button
                            onClick={() => navigate("/login")}
                            className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline"
                        >
                            Login here
                        </button>
                    </p>
                </motion.div>
            </div>
        </div>
    );
};

export default Apply;
