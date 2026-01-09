import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Eye, EyeOff, Loader2, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function SuperAdminActivate() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const token = searchParams.get("token");
    const email = searchParams.get("email");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activated, setActivated] = useState(false);

    useEffect(() => {
        if (!token || !email) {
            toast.error("Invalid activation link");
            navigate("/login");
        }
    }, [token, email, navigate]);

    const validatePassword = (): boolean => {
        if (password.length < 8) {
            toast.error("Password must be at least 8 characters");
            return false;
        }
        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return false;
        }
        return true;
    };

    const handleActivate = async () => {
        if (!validatePassword()) return;

        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/institutions/super-admin/activate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setActivated(true);
                toast.success("Account activated! Redirecting to login...");
                setTimeout(() => navigate("/login"), 2000);
            } else {
                toast.error(data.detail || "Activation failed");
            }
        } catch (error) {
            console.error("Activation error:", error);
            toast.error("Failed to activate account. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (!token || !email) {
        return null;
    }

    if (activated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <Card className="w-full max-w-md border-purple-500/30 bg-slate-900/80 backdrop-blur">
                    <CardContent className="pt-10 pb-10 text-center">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">Account Activated!</h2>
                        <p className="text-slate-400">Redirecting to login...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
            <Card className="w-full max-w-md border-purple-500/30 bg-slate-900/80 backdrop-blur shadow-xl">
                <CardHeader className="text-center">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-white">
                        Super Admin Activation
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                        Welcome to AdmitFlow Platform!<br />
                        Set your password to activate your account.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Email Display */}
                    <div className="bg-slate-800/50 rounded-lg p-4">
                        <p className="text-sm text-slate-400">Account Email</p>
                        <p className="text-white font-medium">{email}</p>
                    </div>

                    {/* Password Field */}
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-slate-300">Password</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Create a strong password"
                                className="bg-slate-800 border-slate-700 text-white pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-slate-300">Confirm Password</Label>
                        <Input
                            id="confirmPassword"
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm your password"
                            className="bg-slate-800 border-slate-700 text-white"
                        />
                    </div>

                    {/* Password Requirements */}
                    <div className="text-xs text-slate-500 space-y-1">
                        <p className={password.length >= 8 ? "text-green-400" : ""}>
                            • At least 8 characters
                        </p>
                        <p className={password === confirmPassword && password.length > 0 ? "text-green-400" : ""}>
                            • Passwords match
                        </p>
                    </div>

                    {/* Activate Button */}
                    <Button
                        onClick={handleActivate}
                        disabled={loading || password.length < 8 || password !== confirmPassword}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold py-3"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Activating...
                            </>
                        ) : (
                            "Activate My Account"
                        )}
                    </Button>

                    <p className="text-center text-xs text-slate-500">
                        After activation, you'll be able to approve institutions, <br />
                        manage platform settings, and invite other super admins.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
