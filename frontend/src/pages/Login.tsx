
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Eye, EyeOff, GraduationCap } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const handleGoogleLogin = async () => {
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
        title: "Login Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      if (data.user) {
        // Enforce Role Check
        if (role === 'admin') {
          // Check if user is in 'admins' table
          const { data: adminData } = await supabase
            .from('admins')
            .select('id')
            .eq('email', data.user.email)
            .maybeSingle();

          if (!adminData) {
            await supabase.auth.signOut();
            throw new Error("User not found in Admin records.");
          }

          toast({
            title: "Login Successful!",
            description: "Welcome back, Admin!",
          });
          navigate("/admin");

        } else {
          // Check if user is in 'students' table
          const { data: studentData } = await supabase
            .from('students')
            .select('role, first_name, last_name')
            .eq('email', data.user.email)
            .maybeSingle();

          if (!studentData) {
            await supabase.auth.signOut();
            throw new Error("User not found in Student records.");
          }

          toast({
            title: "Login Successful!",
            description: "Welcome back, Student!",
          });

          // Redirect to Profile if name is missing (First Time Login)
          const student = studentData as any;
          if (!student.first_name || !student.last_name) {
            navigate("/profile");
          } else {
            navigate("/levels");
          }
        }
      }
    } catch (error: any) {
      console.error("Login error:", error);
      let errorMessage = error.message || "Invalid credentials.";

      if (errorMessage.includes("Email not confirmed")) {
        errorMessage = "Please confirm your email address before logging in. Check your inbox.";
      }

      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address to reset your password.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/reset-password?type=forgot`,
      });
      if (error) throw error;

      toast({
        title: "Email Sent",
        description: "Check your inbox for the password reset link.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-white dark:bg-slate-950">
      <LandingHeader />

      {/* Diagonal Split Background */}
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="absolute inset-0 pointer-events-none"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-700 dark:to-teal-900"
          style={{ clipPath: 'polygon(0 0, 55% 0, 45% 100%, 0 100%)' }}>
        </div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-40 h-40 border-4 border-white rotate-12"></div>
          <div className="absolute bottom-32 left-32 w-24 h-24 border-4 border-white rounded-full"></div>
          <div className="absolute top-1/2 left-20 w-16 h-16 bg-white/20"></div>
        </div>
      </motion.div>

      <div className="relative min-h-screen flex items-center justify-center p-8 pt-24">
        <div className="flex w-full max-w-6xl gap-12 items-center">
          {/* Left Side - Branding */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="hidden lg:block flex-1 text-white z-10"
          >
            <div className="flex items-center gap-3 mb-6">
              <GraduationCap className="w-12 h-12" />
              <span className="text-2xl font-bold">Admit Flow</span>
            </div>
            <h1 className="mb-4 text-4xl font-extrabold leading-tight">Smart Admissions Start Here</h1>
            <p className="text-white/90 text-lg mb-8 max-w-lg">
              Unlock your potential with our AI-powered assessment platform. Join the future of education with a fair, fast, and transparent process.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">✓</div>
                <span className="font-medium">AI-Powered Assessment</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">✓</div>
                <span className="font-medium">Instant Results & Feedback</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">✓</div>
                <span className="font-medium">Seamless Onboarding</span>
              </div>
            </div>
          </motion.div>

          {/* Right Side - Form */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex-1 max-w-md w-full"
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 border border-slate-100 dark:border-slate-800">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Login</h2>

              {/* Role Toggle */}
              <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`py-2.5 rounded-lg transition-all font-medium text-sm ${role === 'student'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`py-2.5 rounded-lg transition-all font-medium text-sm ${role === 'admin'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                >
                  Admin
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div>
                  <Label htmlFor="email" className="block text-gray-700 dark:text-gray-300 mb-2 text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 h-auto rounded-xl border-2 border-gray-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-500 outline-none transition-colors bg-white dark:bg-slate-950"
                  />
                </div>

                {/* Password */}
                <div>
                  <Label htmlFor="password" className="block text-gray-700 dark:text-gray-300 mb-2 text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-3 h-auto rounded-xl border-2 border-gray-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-500 outline-none transition-colors pr-12 bg-white dark:bg-slate-950"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Forgot Password */}
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Submit */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/20 text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Logging in..." : "Login"}
                </motion.button>

                {/* Divider */}
                <div className="flex items-center gap-4 py-2">
                  <div className="flex-1 h-px bg-gray-300 dark:bg-slate-700"></div>
                  <span className="text-gray-500 dark:text-slate-500 text-sm">or</span>
                  <div className="flex-1 h-px bg-gray-300 dark:bg-slate-700"></div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleLogin}
                  className="w-full py-2.5 rounded-lg border-2 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 h-auto text-sm font-medium"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                  Sign in with Google
                </Button>
              </form>

              <p className="text-center text-gray-600 dark:text-gray-400 text-sm mt-6">
                New user?{' '}
                <button
                  onClick={() => navigate("/signup")}
                  className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
                >
                  Create account
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Login;
