import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth } from "@/config/firebase";
import { useToast } from "@/hooks/use-toast";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { ArrowLeft, Eye, EyeOff, LogIn } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

      // Get student UUID from backend by email
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const studentResponse = await fetch(`${backendUrl}/api/students/by-email/${user.email || formData.email}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!studentResponse.ok) {
        if (studentResponse.status === 404) {
          // Student record doesn't exist but Firebase user does
          // This means user's Firebase account exists but profile was never created
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
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-purple-50 to-blue-50 dark:from-background dark:via-purple-950/20 dark:to-blue-950/20" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ModeToggle />
      </div>

      {/* Back Button */}
      <Button
        variant="ghost"
        className="absolute top-4 left-4 z-50"
        onClick={() => navigate("/")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Home
      </Button>

      {/* Login Form */}
      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <Card className="border-2 shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <LogIn className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold gradient-text">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-base">
              Login to continue your admission test
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Forgot Password?
                </button>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                variant="glow"
                disabled={loading}
              >
                {loading ? "Logging in..." : "Login"}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/registration")}
                  className="text-primary hover:underline font-medium"
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
