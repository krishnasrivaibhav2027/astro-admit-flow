
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { ArrowLeft, Building, Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

const OrgRegister = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        org_name: '',
        org_type: '',
        website: '',
        affiliation_number: '',
        state: '',
        admin_name: '',
        admin_email: '',
        admin_phone: '',
        admin_designation: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE}/api/institutions/org/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Failed to submit registration");
            }

            toast({
                title: "Registration Submitted!",
                description: "Your organization registration is under review. You will receive an email once approved.",
            });

            navigate("/login");
        } catch (error: any) {
            console.error("Submit error:", error);
            toast({
                title: "Submission Failed",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const indianStates = [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
        "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
        "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
        "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
        "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
        "Delhi", "Chandigarh", "Puducherry"
    ];

    return (
        <div className="min-h-screen relative overflow-hidden bg-white dark:bg-slate-950">
            <LandingHeader />

            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-slate-950 pointer-events-none" />

            <div className="relative min-h-screen flex items-center justify-center p-8 pt-28 pb-16">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-2xl"
                >
                    {/* Back Button */}
                    <button
                        onClick={() => navigate("/login")}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 mb-6 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Login
                    </button>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-center mb-6">
                            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center">
                                <Building className="w-8 h-8 text-white" />
                            </div>
                        </div>

                        <h2 className="text-center text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                            Organization Registration
                        </h2>
                        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                            Register your institution to use the Admit Flow platform
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Organization Details Section */}
                            <div className="border-b border-gray-200 dark:border-slate-700 pb-6">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                                    Organization Details
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Organization Name */}
                                    <div className="md:col-span-2">
                                        <Label htmlFor="org_name" className="block text-gray-700 dark:text-gray-300 mb-2 text-sm font-medium">
                                            Organization Name *
                                        </Label>
                                        <Input
                                            id="org_name"
                                            type="text"
                                            required
                                            placeholder="e.g., Delhi Public School"
                                            value={formData.org_name}
                                            onChange={(e) => setFormData({ ...formData, org_name: e.target.value })}
                                            className="w-full px-4 py-3 h-auto rounded-xl border-2 border-gray-200 dark:border-slate-700 focus:border-emerald-500"
                                        />
                                    </div>

                                    {/* Organization Type */}
                                    <div>
                                        <Label htmlFor="org_type" className="block text-gray-700 dark:text-gray-300 mb-2 text-sm font-medium">
                                            Type *
                                        </Label>
                                        <Select
                                            value={formData.org_type}
                                            onValueChange={(value) => setFormData({ ...formData, org_type: value })}
                                        >
                                            <SelectTrigger className="w-full px-4 py-3 h-auto rounded-xl border-2 border-gray-200 dark:border-slate-700 focus:ring-emerald-500 dark:focus:ring-emerald-500 bg-white dark:bg-slate-950 text-gray-800 dark:text-white">
                                                <SelectValue placeholder="-- Select type --" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white dark:bg-slate-950 border-gray-200 dark:border-slate-700">
                                                <SelectItem value="school">School</SelectItem>
                                                <SelectItem value="college">College</SelectItem>
                                                <SelectItem value="coaching">Coaching Institute</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* State */}
                                    <div>
                                        <Label htmlFor="state" className="block text-gray-700 dark:text-gray-300 mb-2 text-sm font-medium">
                                            State
                                        </Label>
                                        <Select
                                            value={formData.state}
                                            onValueChange={(value) => setFormData({ ...formData, state: value })}
                                        >
                                            <SelectTrigger className="w-full px-4 py-3 h-auto rounded-xl border-2 border-gray-200 dark:border-slate-700 focus:ring-emerald-500 dark:focus:ring-emerald-500 bg-white dark:bg-slate-950 text-gray-800 dark:text-white">
                                                <SelectValue placeholder="-- Select state --" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white dark:bg-slate-950 border-gray-200 dark:border-slate-700 h-64">
                                                {indianStates.map((state) => (
                                                    <SelectItem key={state} value={state}>{state}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Website */}
                                    <div>
                                        <Label htmlFor="website" className="block text-gray-700 dark:text-gray-300 mb-2 text-sm font-medium">
                                            Official Website
                                        </Label>
                                        <Input
                                            id="website"
                                            type="url"
                                            placeholder="https://yourschool.edu"
                                            value={formData.website}
                                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                            className="w-full px-4 py-3 h-auto rounded-xl border-2 border-gray-200 dark:border-slate-700 focus:border-emerald-500"
                                        />
                                    </div>

                                    {/* Affiliation Number */}
                                    <div>
                                        <Label htmlFor="affiliation" className="block text-gray-700 dark:text-gray-300 mb-2 text-sm font-medium">
                                            Affiliation Number
                                        </Label>
                                        <Input
                                            id="affiliation"
                                            type="text"
                                            placeholder="CBSE/ICSE/State Board No."
                                            value={formData.affiliation_number}
                                            onChange={(e) => setFormData({ ...formData, affiliation_number: e.target.value })}
                                            className="w-full px-4 py-3 h-auto rounded-xl border-2 border-gray-200 dark:border-slate-700 focus:border-emerald-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Admin Details Section */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                                    Admin Contact Details
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Admin Name */}
                                    <div>
                                        <Label htmlFor="admin_name" className="block text-gray-700 dark:text-gray-300 mb-2 text-sm font-medium">
                                            Full Name *
                                        </Label>
                                        <Input
                                            id="admin_name"
                                            type="text"
                                            required
                                            placeholder="Principal / Director name"
                                            value={formData.admin_name}
                                            onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
                                            className="w-full px-4 py-3 h-auto rounded-xl border-2 border-gray-200 dark:border-slate-700 focus:border-emerald-500"
                                        />
                                    </div>

                                    {/* Designation */}
                                    <div>
                                        <Label htmlFor="designation" className="block text-gray-700 dark:text-gray-300 mb-2 text-sm font-medium">
                                            Designation
                                        </Label>
                                        <Input
                                            id="designation"
                                            type="text"
                                            placeholder="e.g., Principal, Director"
                                            value={formData.admin_designation}
                                            onChange={(e) => setFormData({ ...formData, admin_designation: e.target.value })}
                                            className="w-full px-4 py-3 h-auto rounded-xl border-2 border-gray-200 dark:border-slate-700 focus:border-emerald-500"
                                        />
                                    </div>

                                    {/* Admin Email */}
                                    <div>
                                        <Label htmlFor="admin_email" className="block text-gray-700 dark:text-gray-300 mb-2 text-sm font-medium">
                                            Official Email *
                                        </Label>
                                        <Input
                                            id="admin_email"
                                            type="email"
                                            required
                                            placeholder="admin@yourschool.edu"
                                            value={formData.admin_email}
                                            onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                                            className="w-full px-4 py-3 h-auto rounded-xl border-2 border-gray-200 dark:border-slate-700 focus:border-emerald-500"
                                        />
                                    </div>

                                    {/* Admin Phone */}
                                    <div>
                                        <Label htmlFor="admin_phone" className="block text-gray-700 dark:text-gray-300 mb-2 text-sm font-medium">
                                            Phone Number
                                        </Label>
                                        <Input
                                            id="admin_phone"
                                            type="tel"
                                            placeholder="+91 XXXXX XXXXX"
                                            value={formData.admin_phone}
                                            onChange={(e) => setFormData({ ...formData, admin_phone: e.target.value })}
                                            className="w-full px-4 py-3 h-auto rounded-xl border-2 border-gray-200 dark:border-slate-700 focus:border-emerald-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/20 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    "Submit Registration"
                                )}
                            </motion.button>

                            <p className="text-center text-gray-500 dark:text-gray-400 text-xs mt-4">
                                By registering, you agree to our Terms of Service and Privacy Policy.
                                Your application will be reviewed within 2-3 business days.
                            </p>
                        </form>

                        <p className="text-center text-gray-600 dark:text-gray-400 text-sm mt-6">
                            Already registered?{' '}
                            <button
                                onClick={() => navigate("/login")}
                                className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
                            >
                                Login here
                            </button>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default OrgRegister;
