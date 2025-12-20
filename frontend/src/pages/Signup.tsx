
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Eye, EyeOff, Shield, UserPlus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

const signupSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string()
        .min(8, "Password must be at least 8 characters")
        .refine((val) => /[A-Z]/.test(val), "Password must contain at least one uppercase letter")
        .refine((val) => /[!@#$%^&*(),.?":{}|<>]/.test(val), "Password must contain at least one special character"),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

const Signup = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [role, setRole] = useState<'student' | 'admin'>('student');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        confirmPassword: ""
    });

    // Password validation state for UI visual feedback
    const hasMinLength = formData.password.length >= 8;
    const hasUppercase = /[A-Z]/.test(formData.password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(formData.password);

    const handleGoogleSignup = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/levels`,
                },
            });
            if (error) throw error;
        } catch (error: any) {
            console.error("Google Auth Error:", error);
            toast({
                title: "Google Signup Failed",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validate inputs
            signupSchema.parse(formData);

            // Sign up with Supabase
            const { error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        role: role
                    }
                }
            });

            if (error) throw error;

            toast({
                title: "Signup Successful!",
                description: "Please check your email to confirm your account, then log in.",
            });

            navigate("/login");

        } catch (error: any) {
            console.error("Signup error:", error);
            let errorMessage = error.message || "Something went wrong.";
            if (error instanceof z.ZodError) {
                errorMessage = error.errors[0].message;
            }
            toast({
                title: "Signup Failed",
                description: errorMessage,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex relative bg-white dark:bg-slate-950">
            <LandingHeader />

            {/* Left Panel - Form (Scrollable) */}
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
                                <UserPlus className="w-8 h-8 text-white" />
                            </div>
                        </div>

                        <h2 className="text-center text-2xl font-bold mb-2 text-gray-900 dark:text-white">Create Account</h2>
                        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                            Join Admit Flow to start the admission test
                        </p>

                        {/* User type toggle */}
                        <div className="flex gap-2 mb-6">
                            <button
                                type="button"
                                onClick={() => setRole('student')}
                                className={`flex-1 py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 font-medium text-sm border-2 ${role === 'student'
                                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md'
                                    : 'bg-gray-100 border-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:border-slate-800 dark:text-gray-400'
                                    }`}
                            >
                                <UserPlus className="w-4 h-4" />
                                Student
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole('admin')}
                                className={`flex-1 py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 font-medium text-sm border-2 ${role === 'admin'
                                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md'
                                    : 'bg-gray-100 border-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:border-slate-800 dark:text-gray-400'
                                    }`}
                            >
                                <Shield className="w-4 h-4" />
                                Admin
                            </button>
                        </div>

                        {/* Google Sign up */}
                        <Button
                            variant="outline"
                            onClick={handleGoogleSignup}
                            className="w-full mb-6 border-2 h-auto py-2.5 rounded-lg text-sm font-medium border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                        >
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                            Sign up with Google
                        </Button>

                        <div className="relative mb-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200 dark:border-slate-700"></div>
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-white dark:bg-slate-950 px-4 text-sm text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                                    OR CONTINUE WITH EMAIL
                                </span>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Email */}
                            <div>
                                <Label htmlFor="email" className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="h-11 bg-gray-50 border-gray-200 focus:bg-white transition-colors dark:bg-slate-900 dark:border-slate-700"
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <Label htmlFor="password" className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Min 8 chars, 1 uppercase, 1 special"
                                        required
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="h-11 pr-10 bg-gray-50 border-gray-200 focus:bg-white transition-colors dark:bg-slate-900 dark:border-slate-700"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Password Requirements */}
                            <div className="space-y-2 text-sm">
                                <p className="text-gray-600 dark:text-gray-400">Password Requirements:</p>
                                <div className="flex items-center gap-2">
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${hasMinLength ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-slate-600'}`}>
                                        {hasMinLength && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <span className={hasMinLength ? 'text-gray-900 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}>
                                        At least 8 characters
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${hasUppercase ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-slate-600'}`}>
                                        {hasUppercase && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <span className={hasUppercase ? 'text-gray-900 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}>
                                        At least one uppercase letter
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${hasSpecialChar ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-slate-600'}`}>
                                        {hasSpecialChar && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <span className={hasSpecialChar ? 'text-gray-900 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}>
                                        At least one special character
                                    </span>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <Label htmlFor="confirmPassword" className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Confirm Password</Label>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        placeholder="Re-enter password"
                                        required
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        className="h-11 pr-10 bg-gray-50 border-gray-200 focus:bg-white transition-colors dark:bg-slate-900 dark:border-slate-700"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Create Account Button */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/20 text-sm font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                            >
                                {loading ? "Creating Account..." : "Create Account"}
                            </motion.button>

                            <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
                                Already have an account?{' '}
                                <button
                                    type="button"
                                    onClick={() => navigate("/login")}
                                    className="text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                                >
                                    Login here
                                </button>
                            </p>
                        </form>
                    </div>
                </motion.div>
            </div>

            {/* Right Panel - Geometric Design (Hidden on Mobile) */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 items-center justify-center p-12 lg:pt-32 relative overflow-hidden fixed lg:sticky lg:top-0 h-screen">
                <div className="relative z-10 w-full max-w-md flex flex-col items-start justify-center h-full">
                    {/* Text Section */}
                    <div className="mb-12">
                        <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
                            Join Admit Flow
                        </h1>
                        <p className="text-lg text-emerald-100/80 font-light leading-relaxed max-w-sm">
                            Access AI-powered assessments and thousands of practice resources to boost your academic journey.
                        </p>
                    </div>

                    {/* Geometric Art SVG */}
                    <div className="w-full relative aspect-square max-w-sm mx-auto opacity-90">
                        <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-white">
                            {/* Circles */}
                            <circle cx="200" cy="50" r="15" stroke="currentColor" strokeWidth="2" className="animate-pulse" />
                            <circle cx="350" cy="350" r="20" stroke="currentColor" strokeWidth="2" />

                            {/* Main Geometric Structure */}
                            <path
                                d="M100 200 L300 150 L250 350 L100 200"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M100 200 L200 100 L300 150"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M250 350 L350 250 L300 150"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M100 200 L150 300 L250 350"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />

                            {/* Decorative Lines and Dots */}
                            <path d="M50 350 L120 350" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                            <path d="M140 350 L160 350" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                            <path d="M180 350 L200 350" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />

                            {/* Dot Grid Pattern */}
                            <circle cx="280" cy="280" r="2" fill="currentColor" />
                            <circle cx="300" cy="280" r="2" fill="currentColor" />
                            <circle cx="320" cy="280" r="2" fill="currentColor" />
                            <circle cx="280" cy="300" r="2" fill="currentColor" />
                            <circle cx="300" cy="300" r="2" fill="currentColor" />
                            <circle cx="280" cy="320" r="2" fill="currentColor" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Signup;
