
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Building2, Eye, EyeOff, GraduationCap } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Institution {
  id: string;
  name: string;
  type: string;
  state?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<string>('');
  const [loadingInstitutions, setLoadingInstitutions] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  // Fetch institutions on mount
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
    } finally {
      setLoadingInstitutions(false);
    }
  };

  // Validate user belongs to institution
  const validateInstitutionMember = async (email: string, institutionId: string, userRole: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/institutions/validate-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          institution_id: institutionId,
          role: userRole
        })
      });

      if (!response.ok) {
        throw new Error("Validation request failed");
      }

      return await response.json();
    } catch (error) {
      console.error("Validation error:", error);
      throw error;
    }
  };

  // Revoke unauthorized user
  const revokeUnauthorizedUser = async (email: string) => {
    try {
      await fetch(`${API_BASE}/api/institutions/revoke-unauthorized?email=${encodeURIComponent(email)}`, {
        method: 'POST'
      });
    } catch (error) {
      console.error("Revoke error:", error);
    }
  };

  const handleGoogleLogin = async () => {
    // For students, institution is required
    // For admins, institution is optional (super admin check happens in AuthCallback)
    if (role === 'student' && !selectedInstitution) {
      toast({
        title: "Institution Required",
        description: "Please select your institution before signing in.",
        variant: "destructive"
      });
      return;
    }

    localStorage.setItem('pending_institution_id', selectedInstitution || '');
    localStorage.setItem('pending_role', role);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth-callback`,
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
        // For admin role: First check if user is a super admin (no institution needed)
        if (role === 'admin') {
          const validation = await validateInstitutionMember(
            data.user.email!,
            selectedInstitution || 'bypass', // Pass dummy value for super admin check
            role
          );

          if (validation.is_super_admin) {
            // Super admin / Global admin
            // If an institution was selected, save it as context for isolated view
            if (selectedInstitution) {
              localStorage.setItem('admin_institution_context', selectedInstitution);
            } else {
              localStorage.removeItem('admin_institution_context');
            }

            toast({
              title: "Login Successful!",
              description: "Welcome, Global Admin!",
            });
            navigate("/admin");
            return;
          }

          // Not a super admin - check if institution is selected
          if (!selectedInstitution) {
            await supabase.auth.signOut();
            toast({
              title: "Institution Required",
              description: "Please select your institution to continue as admin.",
              variant: "destructive"
            });
            setLoading(false);
            return;
          }

          // Validate institution admin
          if (validation.valid) {
            // Save institution context for dashboard filtering
            localStorage.setItem('admin_institution_context', selectedInstitution);

            toast({
              title: "Login Successful!",
              description: `Welcome to ${validation.institution_name}!`,
            });
            navigate("/admin");
            return;
          } else {
            await supabase.auth.signOut();
            toast({
              title: "Access Denied",
              description: validation.message || "You are not registered as an admin for this institution.",
              variant: "destructive"
            });
            setLoading(false);
            return;
          }
        }

        // Student role - institution is required
        if (!selectedInstitution) {
          await supabase.auth.signOut();
          toast({
            title: "Institution Required",
            description: "Please select your institution.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        // Validate student institution membership
        const validation = await validateInstitutionMember(
          data.user.email!,
          selectedInstitution,
          role
        );

        if (!validation.valid) {
          // Sign out and show error
          await supabase.auth.signOut();

          // Start 5-second countdown to revoke
          toast({
            title: "Access Denied",
            description: validation.message || "You are not registered with this institution.",
            variant: "destructive"
          });

          // Revoke after 5 seconds
          setTimeout(() => {
            revokeUnauthorizedUser(formData.email);
          }, 5000);

          setLoading(false);
          return;
        }

        // Student is valid - proceed with login
        const { data: studentData } = await supabase
          .from('students')
          .select('first_name, last_name')
          .eq('email', data.user.email)
          .maybeSingle();

        toast({
          title: "Login Successful!",
          description: "Welcome back, Student!",
        });

        const student = studentData as any;
        if (!student?.first_name || !student?.last_name) {
          navigate("/profile");
        } else {
          navigate("/levels");
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

      <div className="relative min-h-screen flex items-center justify-center 2xl:justify-start 3xl:justify-start p-8 pt-24 2xl:pl-24 3xl:pl-32 4xl:pl-48">
        <div className="flex w-full max-w-6xl 2xl:max-w-[1400px] 3xl:max-w-[1600px] 4xl:max-w-[2000px] gap-12 2xl:gap-20 3xl:gap-24 4xl:gap-32 items-center">
          {/* Left Side - Branding */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="hidden lg:block flex-1 text-white z-10"
          >
            <div className="flex items-center gap-3 mb-6">
              <GraduationCap className="w-12 h-12 2xl:w-14 2xl:h-14 3xl:w-16 3xl:h-16 4xl:w-20 4xl:h-20" />
              <span className="text-2xl 2xl:text-3xl 3xl:text-3xl 4xl:text-4xl font-bold">Admit Flow</span>
            </div>
            <h1 className="mb-4 2xl:mb-5 3xl:mb-6 4xl:mb-8 text-4xl 2xl:text-5xl 3xl:text-5xl 4xl:text-6xl font-extrabold leading-tight">Smart Admissions Start Here</h1>
            <p className="text-white/90 text-lg 2xl:text-xl 3xl:text-xl 4xl:text-2xl mb-8 2xl:mb-9 3xl:mb-10 4xl:mb-12 max-w-lg 2xl:max-w-xl 3xl:max-w-xl 4xl:max-w-2xl">
              Unlock your potential with our AI-powered assessment platform. Join the future of education with a fair, fast, and transparent process.
            </p>
            <div className="space-y-4 2xl:space-y-5 3xl:space-y-5 4xl:space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 2xl:w-9 2xl:h-9 3xl:w-10 3xl:h-10 4xl:w-12 4xl:h-12 rounded-full bg-white/20 flex items-center justify-center font-bold 2xl:text-lg 3xl:text-lg 4xl:text-xl">✓</div>
                <span className="font-medium 2xl:text-lg 3xl:text-lg 4xl:text-xl">AI-Powered Assessment</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 2xl:w-9 2xl:h-9 3xl:w-10 3xl:h-10 4xl:w-12 4xl:h-12 rounded-full bg-white/20 flex items-center justify-center font-bold 2xl:text-lg 3xl:text-lg 4xl:text-xl">✓</div>
                <span className="font-medium 2xl:text-lg 3xl:text-lg 4xl:text-xl">Instant Results & Feedback</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 2xl:w-9 2xl:h-9 3xl:w-10 3xl:h-10 4xl:w-12 4xl:h-12 rounded-full bg-white/20 flex items-center justify-center font-bold 2xl:text-lg 3xl:text-lg 4xl:text-xl">✓</div>
                <span className="font-medium 2xl:text-lg 3xl:text-lg 4xl:text-xl">Seamless Onboarding</span>
              </div>
            </div>
          </motion.div>

          {/* Right Side - Form */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex-1 max-w-md 2xl:max-w-lg 3xl:max-w-lg 4xl:max-w-xl w-full"
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
                {/* Institution Dropdown */}
                <div>
                  <Label htmlFor="institution" className="block text-gray-700 dark:text-gray-300 mb-2 text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Select Institution
                    </div>
                  </Label>
                  <Select
                    value={selectedInstitution}
                    onValueChange={setSelectedInstitution}
                    disabled={loadingInstitutions}
                  >
                    <SelectTrigger className="w-full px-4 py-3 h-auto rounded-xl border-2 border-gray-200 dark:border-slate-700 focus:ring-emerald-500 dark:focus:ring-emerald-500 bg-white dark:bg-slate-950 text-gray-800 dark:text-white">
                      <SelectValue placeholder={loadingInstitutions ? "Loading institutions..." : "-- Select your institution --"} />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-950 border-gray-200 dark:border-slate-700">
                      {institutions.map((inst) => (
                        <SelectItem key={inst.id} value={inst.id} className="cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                          {inst.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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
                  disabled={loading || (role === 'student' && !selectedInstitution)}
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
                  disabled={role === 'student' && !selectedInstitution}
                  className="w-full py-2.5 rounded-lg border-2 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 h-auto text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                  Sign in with Google
                </Button>
              </form>

              {/* Role-specific registration links */}
              <p className="text-center text-gray-600 dark:text-gray-400 text-sm mt-6">
                {role === 'student' ? (
                  <>
                    New application?{' '}
                    <button
                      onClick={() => navigate("/apply")}
                      className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
                    >
                      Apply now
                    </button>
                  </>
                ) : (
                  <>
                    Representing an org?{' '}
                    <button
                      onClick={() => navigate("/org-register")}
                      className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
                    >
                      Register
                    </button>
                  </>
                )}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Login;
