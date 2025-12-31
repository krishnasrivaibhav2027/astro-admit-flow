
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

/**
 * AuthCallback - Handles post-OAuth institution validation
 * 
 * This page is hit after Google OAuth redirects back.
 * It validates the user against the selected institution.
 */
const AuthCallback = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [status, setStatus] = useState("Verifying your access...");

    useEffect(() => {
        handleAuthCallback();
    }, []);

    const handleAuthCallback = async () => {
        try {
            // Get session
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error || !session?.user) {
                throw new Error("Authentication failed. Please try again.");
            }

            const email = session.user.email;
            const institutionId = localStorage.getItem('pending_institution_id');
            const role = localStorage.getItem('pending_role') || 'student';

            // Clear pending data
            localStorage.removeItem('pending_institution_id');
            localStorage.removeItem('pending_role');

            if (!institutionId && role === 'student') {
                // Students must have an institution
                toast({
                    title: "Institution Selection Required",
                    description: "Please select an institution and try again.",
                    variant: "destructive"
                });
                await supabase.auth.signOut();
                navigate("/login");
                return;
            }

            setStatus("Validating access...");

            // Validate institution membership
            const response = await fetch(`${API_BASE}/api/institutions/validate-member`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    institution_id: institutionId || 'bypass', // Pass 'bypass' for super admin check
                    role
                })
            });

            const validation = await response.json();

            if (!validation.valid) {
                setStatus("Access denied. Revoking authentication...");

                // Sign out
                await supabase.auth.signOut();

                toast({
                    title: "Access Denied",
                    description: validation.message || "You are not registered with this institution.",
                    variant: "destructive"
                });

                // Production-ready revocation: Only revoke users who just signed up
                // This prevents accidentally deleting existing users
                const userCreatedAt = new Date(session.user.created_at);
                const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

                if (userCreatedAt > fiveMinutesAgo) {
                    // User was just created - safe to revoke
                    console.log("New unauthorized user detected, scheduling revocation:", email);
                    setTimeout(async () => {
                        try {
                            await fetch(`${API_BASE}/api/institutions/revoke-unauthorized?email=${encodeURIComponent(email!)}`, {
                                method: 'POST'
                            });
                            console.log("Revoked unauthorized user:", email);
                        } catch (e) {
                            console.error("Revoke error:", e);
                        }
                    }, 5000);
                } else {
                    // Existing user - don't revoke, just log
                    console.log("Existing user failed validation:", email, "- Not revoking (account older than 5 minutes)");
                }

                navigate("/login");
                return;
            }

            // Valid user - proceed
            setStatus("Access granted! Redirecting...");

            if (validation.is_super_admin) {
                // Save institution context if one was selected (for isolated view)
                if (institutionId && institutionId !== 'bypass') {
                    localStorage.setItem('admin_institution_context', institutionId);
                } else {
                    localStorage.removeItem('admin_institution_context');
                }

                toast({
                    title: "Welcome, Super Admin!",
                    description: "Redirecting to admin dashboard...",
                });
                navigate("/admin");
            } else if (role === 'admin') {
                // Save institution context for dashboard filtering
                if (institutionId) {
                    localStorage.setItem('admin_institution_context', institutionId);
                }

                toast({
                    title: "Welcome!",
                    description: `Logged in to ${validation.institution_name}`,
                });
                navigate("/admin");
            } else {
                // Student - check profile
                const { data: studentData } = await supabase
                    .from('students')
                    .select('first_name, last_name')
                    .eq('email', email)
                    .maybeSingle();

                toast({
                    title: "Welcome back!",
                    description: "Login successful.",
                });

                if (!studentData?.first_name || !studentData?.last_name) {
                    navigate("/profile");
                } else {
                    navigate("/levels");
                }
            }
        } catch (error: any) {
            console.error("Auth callback error:", error);
            toast({
                title: "Authentication Error",
                description: error.message,
                variant: "destructive"
            });
            navigate("/login");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-slate-950">
            <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 text-lg">{status}</p>
            </div>
        </div>
    );
};

export default AuthCallback;
