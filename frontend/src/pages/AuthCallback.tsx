
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
    const authProcessing = useRef(false);

    const handleError = (message: string) => {
        setStatus("Authentication failed: " + message);
        toast({
            title: "Login Failed",
            description: message,
            variant: "destructive"
        });
        // Do not navigate immediately, allow user to see the error message.
        // The timeout fallback or handleAuthWithSession's error block will handle eventual redirection.
    };

    useEffect(() => {
        let mounted = true;
        console.log("AuthCallback mounted. URL:", window.location.href);

        const processAuth = async () => {
            // 1. Try getting existing session
            const { data: { session: existingSession } } = await supabase.auth.getSession();
            if (existingSession) {
                await handleAuthWithSession(existingSession);
                return;
            }

            // 2. Check for Implicit Flow (Hash containing access_token)
            const hashParams = new URLSearchParams(window.location.hash.substring(1)); // Remove #
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');

            if (accessToken && refreshToken) {
                console.log("Found tokens in hash, manually setting session...");
                const { data, error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });
                if (error) {
                    console.error("Error setting session from hash:", error);
                    handleError(error.message);
                } else if (data.session) {
                    await handleAuthWithSession(data.session);
                }
                return;
            }

            // 3. Check for PKCE Flow (Search params containing code)
            const searchParams = new URLSearchParams(window.location.search);
            const code = searchParams.get('code');

            if (code) {
                console.log("Found code in URL, exchanging for session...");
                const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                if (error) {
                    console.error("Error exchanging code:", error);
                    handleError(error.message);
                } else if (data.session) {
                    await handleAuthWithSession(data.session);
                }
                return;
            }

            // 4. Fallback: Wait for onAuthStateChange (Supabase auto-handling)
            console.log("No manual tokens found, waiting for Supabase auto-detect...");
        };

        processAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("Auth event:", event);
            if (event === 'SIGNED_IN' && session) {
                if (mounted) await handleAuthWithSession(session);
            }
        });

        // Timeout fallback
        const timeoutId = setTimeout(() => {
            if (mounted && status.includes("Verifying")) {
                // Last check
                supabase.auth.getSession().then(({ data: { session } }) => {
                    if (!session && mounted) {
                        setStatus("Authentication failed. Session did not establish.");
                        toast({
                            title: "Login Failed",
                            description: "Could not verify your login. Please try again.",
                            variant: "destructive"
                        });
                        // Don't auto-redirect immediately so user sees error
                    }
                });
            }
        }, 10000); // 10s timeout

        return () => {
            mounted = false;
            subscription.unsubscribe();
            clearTimeout(timeoutId);
        };
    }, []);

    const handleAuthWithSession = async (session: any) => {
        if (authProcessing.current) return;
        authProcessing.current = true;

        try {
            const email = session.user.email;
            if (!email) throw new Error("No email provided");

            const institutionId = localStorage.getItem('pending_institution_id');
            const role = localStorage.getItem('pending_role') || 'student';

            // Clear pending data
            localStorage.removeItem('pending_institution_id');
            localStorage.removeItem('pending_role');

            if (!institutionId && role === 'student') {
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
                    institution_id: institutionId || 'bypass',
                    role
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Validation failed");
            }

            const validation = await response.json();

            if (!validation.valid) {
                setStatus("Access denied. Revoking authentication...");
                await supabase.auth.signOut();

                toast({
                    title: "Access Denied",
                    description: validation.message || "You are not registered with this institution.",
                    variant: "destructive"
                });

                // New user revocation check
                const userCreatedAt = new Date(session.user.created_at);
                const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
                if (userCreatedAt > fiveMinutesAgo) {
                    fetch(`${API_BASE}/api/institutions/revoke-unauthorized?email=${encodeURIComponent(email)}`, { method: 'POST' });
                }

                navigate("/login");
                return;
            }

            // Valid user - proceed
            setStatus("Access granted! Redirecting...");

            if (validation.is_super_admin) {
                if (institutionId && institutionId !== 'bypass') {
                    localStorage.setItem('admin_institution_context', institutionId);
                } else {
                    localStorage.removeItem('admin_institution_context');
                }
                toast({ title: "Welcome, Super Admin!", description: "Redirecting to admin dashboard..." });
                navigate("/admin");

            } else if (role === 'admin') {
                if (institutionId) {
                    localStorage.setItem('admin_institution_context', institutionId);
                }
                toast({ title: "Welcome!", description: `Logged in to ${validation.institution_name}` });
                navigate("/admin");

            } else {
                const { data: studentData } = await supabase
                    .from('students')
                    .select('first_name, last_name')
                    .eq('email', email)
                    .maybeSingle();

                toast({ title: "Welcome back!", description: "Login successful." });

                if (!studentData?.first_name || !studentData?.last_name) {
                    navigate("/profile");
                } else {
                    navigate("/levels");
                }
            }

        } catch (error: any) {
            console.error("Auth callback processing error:", error);
            setStatus("Error: " + error.message);
            toast({
                title: "Authentication Error",
                description: error.message,
                variant: "destructive"
            });
            // Delay redirect so user can see error
            setTimeout(() => navigate("/login"), 3000);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-slate-950 p-4">
            <div className="text-center mb-8">
                <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">{status}</p>
            </div>

            {/* DEBUG SECTION */}
            <div className="w-full max-w-2xl bg-slate-900 text-slate-200 p-4 rounded-lg shadow-xl text-left overflow-hidden border border-slate-700">
                <h3 className="text-emerald-400 font-bold mb-2 border-b border-slate-700 pb-1 flex justify-between items-center">
                    <span>🛠️ Debug Info</span>
                    <span className="text-xs text-slate-500 font-normal">Share this if stuck</span>
                </h3>
                <div className="space-y-2 font-mono text-xs overflow-x-auto">
                    <div>
                        <span className="text-slate-500">Current URL:</span>
                        <div className="text-slate-300 break-all">{window.location.href}</div>
                    </div>
                    <div>
                        <span className="text-slate-500">Status:</span>
                        <span className="text-yellow-300 ml-2">{status}</span>
                    </div>
                    <div>
                        <span className="text-slate-500">Session Check:</span>
                        <span className="text-slate-300 ml-2">
                            {/* We can't easily access 'session' variable here without state, 
                                but we can show if localStorage has pending items */}
                            Pending Inst: {localStorage.getItem('pending_institution_id') || 'None'} |
                            Pending Role: {localStorage.getItem('pending_role') || 'None'}
                        </span>
                    </div>
                    <div className="pt-2 border-t border-slate-800 mt-2">
                        <p className="text-slate-500 mb-1">Troubleshooting Tips:</p>
                        <ul className="list-disc pl-4 text-slate-400 space-y-1">
                            <li>If stuck on "Verifying", the backend API might be unreachable.</li>
                            <li>If "Access Denied", your email doesn't match the institution records.</li>
                            <li>Ensure you selected an institution BEFORE clicking Google Login.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthCallback;
