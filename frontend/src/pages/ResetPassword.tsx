
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const ResetPassword = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formData, setFormData] = useState({
        password: "",
        confirmPassword: ""
    });

    const getPasswordStrength = (password: string) => {
        let strength = 0;
        if (password.length >= 8) strength += 25;
        if (/[A-Z]/.test(password)) strength += 25;
        if (/[0-9]/.test(password)) strength += 25;
        if (/[^A-Za-z0-9]/.test(password)) strength += 25;
        return strength;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (formData.password !== formData.confirmPassword) {
            toast({
                title: "Passwords do not match",
                description: "Please ensure both passwords match.",
                variant: "destructive"
            });
            setLoading(false);
            return;
        }

        if (getPasswordStrength(formData.password) < 75) {
            toast({
                title: "Weak Password",
                description: "Please choose a stronger password.",
                variant: "destructive"
            });
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({
                password: formData.password
            });

            if (error) throw error;

            // Create a professional looking toast
            toast({
                title: "Password Updated Successfully!",
                description: "You have been redirected to the dashboard.",
                className: "bg-emerald-50 border-emerald-200 text-emerald-800",
                duration: 5000,
            });

            // Check if flow is 'forgot' or 'update'
            const searchParams = new URLSearchParams(window.location.search);
            const flowType = searchParams.get('type');

            if (flowType === 'forgot') {
                // Forgot Password Flow: Force Logout -> Login
                await supabase.auth.signOut();
                navigate("/login");
            } else {
                // Update Password Flow: Stay Logged In -> Levels
                navigate("/levels");
            }

        } catch (error: any) {
            console.error("Reset password error:", error);
            toast({
                title: "Reset Failed",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const strength = getPasswordStrength(formData.password);

    return (
        <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 pt-24 font-sans">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-background via-emerald-50 to-teal-50 dark:from-background dark:via-emerald-950/20 dark:to-teal-950/20" />
            <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

            <LandingHeader />

            <div className="relative z-10 w-full max-w-md animate-fade-in">
                <Card className="border-2 shadow-2xl bg-card/80 backdrop-blur-sm">
                    <CardHeader className="space-y-1 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-emerald-500/10 rounded-full">
                                <LockKeyhole className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                            </div>
                        </div>
                        <CardTitle className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                            Reset Password
                        </CardTitle>
                        <CardDescription className="text-base">
                            Enter a new secure password for your account
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">

                            {/* New Password Field */}
                            <div className="space-y-2">
                                <Label htmlFor="password">New Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="Enter new password"
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

                                {/* Password Strength Indicator */}
                                {formData.password && (
                                    <div className="space-y-2 pt-2">
                                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-300 ${strength < 50 ? 'bg-red-500' :
                                                    strength < 75 ? 'bg-yellow-500' : 'bg-emerald-500'
                                                    }`}
                                                style={{ width: `${strength}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground text-right">
                                            {strength < 50 ? "Weak" : strength < 75 ? "Medium" : "Strong"}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Confirm Password Field */}
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        required
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        placeholder="Confirm new password"
                                        className="pr-10"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="h-4 w-4 text-gray-500" />
                                        ) : (
                                            <Eye className="h-4 w-4 text-gray-500" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 border-none mt-4"
                                size="lg"
                                disabled={loading}
                            >
                                {loading ? "Saving..." : "Save New Password"}
                            </Button>

                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ResetPassword;
