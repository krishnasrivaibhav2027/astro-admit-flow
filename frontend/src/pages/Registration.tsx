import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, UserPlus, Shield } from "lucide-react";
import { z } from "zod";
import HCaptcha from "@hcaptcha/react-hcaptcha";

const registrationSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  age: z.number().min(16, "Must be at least 16 years old").max(100, "Invalid age"),
  dob: z.string().min(1, "Date of birth is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 characters")
});

const Registration = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    age: "",
    dob: "",
    email: "",
    phone: ""
  });

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
  };

  const handleCaptchaExpire = () => {
    setCaptchaToken(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if captcha is verified
    if (!captchaToken) {
      toast({
        title: "Verification Required",
        description: "Please complete the CAPTCHA verification.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const validated = registrationSchema.parse({
        ...formData,
        age: parseInt(formData.age)
      });

      const { data, error } = await supabase
        .from("students")
        .insert([{
          first_name: validated.firstName,
          last_name: validated.lastName,
          age: validated.age,
          dob: validated.dob,
          email: validated.email,
          phone: validated.phone
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Registration Successful!",
        description: "You can now proceed to the test.",
      });

      navigate("/levels", { state: { studentId: data.id } });
    } catch (error: any) {
      // Reset captcha on error
      setCaptchaToken(null);
      captchaRef.current?.resetCaptcha();
      
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
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-purple-50 to-blue-50 dark:from-background dark:via-purple-950/20 dark:to-blue-950/20" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

      <div className="relative z-10 w-full max-w-2xl animate-fade-in">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <Card className="border-2 shadow-elevated">
          <CardHeader className="space-y-1 text-center pb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl mx-auto mb-4 flex items-center justify-center glow-effect">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold">
              Student <span className="gradient-text">Registration</span>
            </CardTitle>
            <CardDescription className="text-base">
              Fill in your details to begin the admission test
            </CardDescription>
          </CardHeader>
          
          <CardContent>
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

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age *</Label>
                  <Input
                    id="age"
                    type="number"
                    required
                    min="16"
                    max="100"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="18"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth *</Label>
                  <Input
                    id="dob"
                    type="date"
                    required
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  />
                </div>
              </div>

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

              {/* hCaptcha Verification */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <Label>Security Verification</Label>
                </div>
                <div className="flex justify-center">
                  <HCaptcha
                    sitekey={import.meta.env.VITE_HCAPTCHA_SITE_KEY}
                    onVerify={handleCaptchaVerify}
                    onExpire={handleCaptchaExpire}
                    ref={captchaRef}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                variant="glow"
                disabled={loading || !captchaToken}
              >
                {loading ? "Registering..." : "Register & Start Test"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Registration;
