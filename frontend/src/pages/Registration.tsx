import { LandingHeader } from "@/components/landing/LandingHeader";
import { PasswordMatch, PasswordStrength } from "@/components/PasswordStrength";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { auth } from "@/config/firebase";
import { useToast } from "@/hooks/use-toast";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

const registrationSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  age: z.number().min(16, "Must be at least 16 years old").max(100, "Invalid age"),
  dob: z.string().min(1, "Date of birth is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .refine((val) => /[A-Z]/.test(val), "Password must contain at least one uppercase letter")
    .refine((val) => /[!@#$%^&*(),.?":{}|<>]/.test(val), "Password must contain at least one special character"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const Registration = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    age: "",
    dob: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: ""
  });

  // Calculate age from date of birth
  const calculateAge = (dob: string) => {
    if (!dob) return "";
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  };

  const handleDobChange = (dob: string) => {
    const calculatedAge = calculateAge(dob);
    setFormData({ ...formData, dob, age: calculatedAge });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate based on role
      if (!isAdmin) {
        registrationSchema.parse({
          ...formData,
          age: parseInt(formData.age)
        });
      } else {
        // Simple validation for admin
        if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
          throw new Error("Please fill in all required fields.");
        }
      }

      let userCredential;
      let isNewUser = true;

      try {
        // Try to create user with Firebase Authentication
        userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );
      } catch (firebaseError: any) {
        if (firebaseError.code === 'auth/email-already-in-use') {
          // For admin, we might want to allow login if firebase user exists? 
          // But let's keep it simple: Register means Register.
          throw firebaseError;
        } else {
          throw firebaseError;
        }
      }

      const user = userCredential.user;
      const idToken = await user.getIdToken();
      localStorage.setItem('firebase_token', idToken);

      const backendUrl = import.meta.env.VITE_BACKEND_URL;

      if (isAdmin) {
        // Register as Admin
        const response = await fetch(`${backendUrl}/api/admin/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to create admin record');
        }

        toast({ title: "Admin Registration Successful!", description: "Welcome Admin." });
        navigate("/admin");

      } else {
        // Register as Student (existing logic)
        const response = await fetch(`${backendUrl}/api/students`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            first_name: formData.firstName,
            last_name: formData.lastName,
            age: parseInt(formData.age),
            dob: formData.dob,
            email: formData.email,
            phone: formData.phone
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to create student record');
        }

        const studentData = await response.json();
        sessionStorage.setItem('studentId', studentData.id);
        sessionStorage.setItem('studentEmail', formData.email);

        toast({ title: "Registration Successful!", description: "Welcome! You can now proceed to the test." });
        navigate("/levels", { state: { studentId: studentData.id } });
      }

    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Registration Failed",
        description: error.message || "Please check your information and try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 pt-24">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-emerald-50 to-teal-50 dark:from-background dark:via-emerald-950/20 dark:to-teal-950/20" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

      <LandingHeader />

      <div className="relative z-10 w-full max-w-2xl animate-fade-in">

        <Card className="border-2 shadow-elevated">
          <CardHeader className="space-y-1 text-center pb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mx-auto mb-4 flex items-center justify-center glow-effect">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold">
              {isAdmin ? "Admin" : "Student"} <span className="text-emerald-500">Registration</span>
            </CardTitle>
            <CardDescription className="text-base">
              Fill in your details to begin
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="flex items-center justify-center space-x-2 mb-6">
              <Label htmlFor="admin-mode" className="text-sm font-medium">Student</Label>
              <Switch id="admin-mode" checked={isAdmin} onCheckedChange={setIsAdmin} className="data-[state=checked]:bg-emerald-500" />
              <Label htmlFor="admin-mode" className="text-sm font-medium">Admin</Label>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="John"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Doe"
                  />
                </div>
              </div>

              {!isAdmin && (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of Birth *</Label>
                      <DatePicker
                        date={formData.dob ? new Date(formData.dob) : undefined}
                        setDate={(date) => {
                          if (date) {
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            handleDobChange(`${year}-${month}-${day}`);
                          } else {
                            handleDobChange("");
                          }
                        }}
                        className="h-11 bg-gray-50 border-gray-200 focus:bg-white transition-colors dark:bg-slate-900 dark:border-slate-700 w-full"
                        captionLayout="dropdown-buttons"
                        fromYear={1900}
                        toYear={new Date().getFullYear()}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="age">Age * (Auto-calculated)</Label>
                      <Input
                        id="age"
                        type="number"
                        required
                        min="16"
                        max="100"
                        value={formData.age}
                        readOnly
                        disabled
                        placeholder="Auto-calculated"
                        className="bg-muted"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1234567890"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john.doe@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimum 8 characters"
                />
                <PasswordStrength password={formData.password} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Re-enter your password"
                />
                <PasswordMatch
                  password={formData.password}
                  confirmPassword={formData.confirmPassword}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 border-none dark:bg-none"
                size="lg"
                disabled={loading}
              >
                {loading ? "Registering..." : (isAdmin ? "Register as Admin" : "Register & Start Test")}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:underline font-medium"
                >
                  Login here
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Registration;
