
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Building2, CheckCircle, FileText, GraduationCap, Link as LinkIcon, Upload, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Institution {
    id: string;
    name: string;
    type: string;
    state: string | null;
}

const ApplyForAccess = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        institutionId: "",
        stream: "",
    });
    const [scorecardFile, setScorecardFile] = useState<File | null>(null);
    const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
    const [scorecardUrl, setScorecardUrl] = useState('');

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

    useEffect(() => {
        fetchInstitutions();
    }, []);

    const fetchInstitutions = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/institutions`);
            if (response.ok) {
                const data = await response.json();
                setInstitutions(data);
            }
        } catch (error) {
            console.error("Error fetching institutions:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validate scorecard input based on mode
            if (uploadMode === 'file' && !scorecardFile) {
                throw new Error("Please upload your scorecard");
            }
            if (uploadMode === 'url' && !scorecardUrl.trim()) {
                throw new Error("Please enter your Google Drive link");
            }

            // Create form data for submission
            const submitData = new FormData();
            submitData.append("institution_id", formData.institutionId);
            submitData.append("name", formData.name);
            submitData.append("email", formData.email);
            submitData.append("phone", formData.phone);
            submitData.append("stream_applied", formData.stream);

            // Add scorecard based on upload mode
            if (uploadMode === 'file' && scorecardFile) {
                submitData.append("scorecard", scorecardFile);
            } else if (uploadMode === 'url') {
                submitData.append("scorecard_url_input", scorecardUrl.trim());
            }

            const response = await fetch(`${API_BASE}/api/institutions/student-access/request/form`, {
                method: "POST",
                body: submitData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || "Failed to submit request");
            }

            setSubmitted(true);
            toast({
                title: "Application Submitted!",
                description: "Your institution will review your request and contact you soon.",
            });

        } catch (error: any) {
            console.error("Submit error:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to submit application",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen w-full flex relative bg-white dark:bg-slate-950">
                <LandingHeader />
                <div className="w-full flex items-center justify-center pt-32">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center max-w-md mx-auto p-8"
                    >
                        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                            Application Submitted!
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Your application has been sent to the institution. They will review your scorecard and contact you via email once approved.
                        </p>
                        <Button onClick={() => navigate("/login")} className="bg-emerald-500 hover:bg-emerald-600">
                            Go to Login
                        </Button>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex relative bg-white dark:bg-slate-950">
            <LandingHeader />

            {/* Left Panel - Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center p-4 lg:p-8 pt-32 lg:pt-32 min-h-screen bg-gray-50 dark:bg-slate-900 overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                    className="w-full max-w-md mx-auto"
                >
                    <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-xl p-8 border border-slate-100 dark:border-slate-800 my-4">
                        <div className="flex justify-center mb-6">
                            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center">
                                <GraduationCap className="w-8 h-8 text-white" />
                            </div>
                        </div>

                        <h2 className="text-center text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                            Apply for Access
                        </h2>
                        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                            Request access to your institution's assessment platform
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Institution Selection */}
                            <div>
                                <Label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                    <Building2 className="w-4 h-4 inline mr-2" />
                                    Select Institution
                                </Label>
                                <Select
                                    value={formData.institutionId}
                                    onValueChange={(value) => setFormData({ ...formData, institutionId: value })}
                                >
                                    <SelectTrigger className="w-full h-11 px-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500">
                                        <SelectValue placeholder="-- Select your institution --" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-slate-950 border-gray-200 dark:border-slate-700">
                                        {institutions.map((inst) => (
                                            <SelectItem key={inst.id} value={inst.id}>
                                                {inst.name} ({inst.type})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Full Name */}
                            <div>
                                <Label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                    <User className="w-4 h-4 inline mr-2" />
                                    Full Name
                                </Label>
                                <Input
                                    type="text"
                                    placeholder="Your full name"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="h-11 bg-gray-50 border-gray-200 dark:bg-slate-900 dark:border-slate-700"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <Label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                    Email Address
                                </Label>
                                <Input
                                    type="email"
                                    placeholder="your.email@example.com"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="h-11 bg-gray-50 border-gray-200 dark:bg-slate-900 dark:border-slate-700"
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <Label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                    Phone Number
                                </Label>
                                <Input
                                    type="tel"
                                    placeholder="+91 9876543210"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="h-11 bg-gray-50 border-gray-200 dark:bg-slate-900 dark:border-slate-700"
                                />
                            </div>

                            {/* Stream */}
                            <div>
                                <Label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                    Stream / Course Applied
                                </Label>
                                <Input
                                    type="text"
                                    placeholder="e.g., Science, Commerce, Engineering"
                                    value={formData.stream}
                                    onChange={(e) => setFormData({ ...formData, stream: e.target.value })}
                                    className="h-11 bg-gray-50 border-gray-200 dark:bg-slate-900 dark:border-slate-700"
                                />
                            </div>

                            {/* Scorecard Upload - Dual Mode */}
                            <div>
                                <Label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                                    <FileText className="w-4 h-4 inline mr-2" />
                                    Scorecard
                                </Label>

                                {/* Toggle Tabs */}
                                <div className="flex rounded-lg bg-gray-100 dark:bg-slate-800 p-1 mb-3">
                                    <button
                                        type="button"
                                        onClick={() => { setUploadMode('file'); setScorecardUrl(''); }}
                                        className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2
                                            ${uploadMode === 'file'
                                                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                                            }`}
                                    >
                                        <Upload className="w-4 h-4" />
                                        Upload File
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setUploadMode('url'); setScorecardFile(null); }}
                                        className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2
                                            ${uploadMode === 'url'
                                                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                                            }`}
                                    >
                                        <LinkIcon className="w-4 h-4" />
                                        Google Drive
                                    </button>
                                </div>

                                {/* File Upload Mode */}
                                {uploadMode === 'file' && (
                                    <div>
                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                onChange={(e) => setScorecardFile(e.target.files?.[0] || null)}
                                                className="w-full h-11 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-emerald-500 file:text-white file:text-sm"
                                            />
                                        </div>
                                        {scorecardFile && (
                                            <p className="text-sm text-emerald-600 mt-1 flex items-center gap-1">
                                                <Upload className="w-3 h-3" />
                                                {scorecardFile.name}
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-500 mt-1">PDF, JPG, or PNG (max 50MB)</p>
                                    </div>
                                )}

                                {/* URL Input Mode */}
                                {uploadMode === 'url' && (
                                    <div>
                                        <Input
                                            type="url"
                                            placeholder="https://drive.google.com/file/d/..."
                                            value={scorecardUrl}
                                            onChange={(e) => setScorecardUrl(e.target.value)}
                                            className="h-11 bg-gray-50 border-gray-200 dark:bg-slate-900 dark:border-slate-700"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Paste the sharing link from Google Drive (make sure it's viewable)
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Submit Button */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/20 text-sm font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                            >
                                {loading ? "Submitting..." : "Submit Application"}
                            </motion.button>

                            <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
                                Already have access?{' '}
                                <button
                                    type="button"
                                    onClick={() => navigate("/login")}
                                    className="text-emerald-500 hover:text-emerald-600 font-semibold hover:underline"
                                >
                                    Login here
                                </button>
                            </p>
                        </form>
                    </div>
                </motion.div>
            </div>

            {/* Right Panel - Info */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 items-center justify-center p-12 lg:pt-32 relative overflow-hidden fixed lg:sticky lg:top-0 h-screen">
                <div className="relative z-10 w-full max-w-md flex flex-col items-start justify-center h-full">
                    <div className="mb-12">
                        <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
                            Join Your Institution
                        </h1>
                        <p className="text-lg text-emerald-100/80 font-light leading-relaxed max-w-sm">
                            Apply for access to your institution's AI-powered assessment platform.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-700/50 flex items-center justify-center flex-shrink-0">
                                <CheckCircle className="w-5 h-5 text-emerald-300" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold">Submit Your Application</h3>
                                <p className="text-emerald-200/70 text-sm">Upload your scorecard and fill in your details</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-700/50 flex items-center justify-center flex-shrink-0">
                                <CheckCircle className="w-5 h-5 text-emerald-300" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold">Institution Reviews</h3>
                                <p className="text-emerald-200/70 text-sm">Your institution admin will verify your request</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-700/50 flex items-center justify-center flex-shrink-0">
                                <CheckCircle className="w-5 h-5 text-emerald-300" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold">Get Access</h3>
                                <p className="text-emerald-200/70 text-sm">Once approved, login with your institution to start</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApplyForAccess;
