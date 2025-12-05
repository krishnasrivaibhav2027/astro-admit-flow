import { LandingHeader } from "@/components/landing/LandingHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { auth } from "@/config/firebase";
import { useToast } from "@/hooks/use-toast";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Sign in with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const user = userCredential.user;

      // Get Firebase ID token
      const idToken = await user.getIdToken();

      // Store Firebase token
      localStorage.setItem('firebase_token', idToken);

      console.log("User authenticated with Firebase, UID:", user.uid);

      const backendUrl = import.meta.env.VITE_BACKEND_URL;

      if (isAdmin) {
        // Admin Login
        const adminResponse = await fetch(`${backendUrl}/api/admin/me`, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });

        if (!adminResponse.ok) {
          throw new Error("Admin profile not found. Please register as an admin first.");
        }

        const adminData = await adminResponse.json();

        toast({
          title: "Admin Login Successful!",
          description: `Welcome back, ${adminData.first_name}!`,
        });

        navigate("/admin");

      } else {
        // Student Login
        // Get student UUID from backend by email
        const studentResponse = await fetch(`${backendUrl}/api/students/by-email/${user.email || formData.email}`, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });

        if (!studentResponse.ok) {
          if (studentResponse.status === 404) {
            // Student record doesn't exist but Firebase user does
            throw new Error('Your account exists but profile is incomplete. Please use "Register" to complete your profile with this email.');
          }
          throw new Error('Failed to get student information. Please try again.');
        }

        const studentData = await studentResponse.json();
        const studentId = studentData.id;

        // Store student info in session
        sessionStorage.setItem('studentId', studentId);
        sessionStorage.setItem('studentEmail', user.email || formData.email);
        localStorage.setItem('userEmail', user.email);

        console.log("Student ID retrieved:", studentId);

        toast({
          title: "Login Successful!",
          description: `Welcome back!`,
        });

        // Navigate to levels page
        navigate("/levels", { state: { studentId: studentId } });
      }

    } catch (error: any) {
      console.error("Login error:", error);

      let errorMessage = "Invalid email or password. Please try again.";
      if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email.";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Incorrect password.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many failed attempts. Please try again later.";
      } else if (error.message) {
        errorMessage = error.message;
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
      await sendPasswordResetEmail(auth, formData.email);
      toast({
        title: "Password Reset Email Sent!",
        description: "Please check your email for instructions to reset your password.",
      });
    } catch (error: any) {
      console.error("Password reset error:", error);
      let errorMessage = "Failed to send password reset email.";
      if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email address.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Invalid email address.";
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 pt-24">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-emerald-50 to-teal-50 dark:from-background dark:via-emerald-950/20 dark:to-teal-950/20" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

      <LandingHeader />

      {/* Login Form */}
      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <Card className="border-2 shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-emerald-500/10 rounded-full">
                <LogIn className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-base">
              Login to continue your admission test
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center space-x-2 mb-6">
              <Label htmlFor="admin-mode" className="text-sm font-medium">Student</Label>
              <Switch
                id="admin-mode"
                checked={isAdmin}
                onCheckedChange={setIsAdmin}
                className="data-[state=checked]:bg-emerald-500"
              />
              <Label htmlFor="admin-mode" className="text-sm font-medium">Admin</Label>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john.doe@example.com"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:underline font-medium"
                >
                  Forgot Password?
                </button>
              </div>

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 border-none dark:bg-none"
                size="lg"
                disabled={loading}
              >
                {loading ? "Logging in..." : "Login"}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/registration")}
                  className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:underline font-medium"
                >
                  Register here
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
