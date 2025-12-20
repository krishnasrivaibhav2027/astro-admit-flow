import { ContactAdminModal } from "@/components/ContactAdminModal";
import { StudentHeader } from "@/components/StudentHeader";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

const StudentLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const checkProfile = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                // Let the router handle unauth via protected routes if they exist, 
                // or redirect here if we want to be strict.
                // Assuming Login check is handled elsewhere or let it fail gracefully?
                // Actually better to redirect to login.
                navigate('/login');
                return;
            }

            // If we are already on profile page, we might not need to check, 
            // BUT we want to fill sessionStorage if existing.

            try {
                const backendUrl = import.meta.env.VITE_BACKEND_URL;
                const response = await fetch(`${backendUrl}/api/students/by-email/${session.user.email}`, {
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`
                    }
                });

                if (response.ok) {
                    const studentData = await response.json();
                    sessionStorage.setItem('studentId', studentData.id);
                    sessionStorage.setItem('studentEmail', studentData.email);

                    // If everything is good, we stop checking
                    setChecking(false);
                } else if (response.status === 404) {
                    // Profile not found
                    if (location.pathname !== '/profile') {
                        navigate('/profile');
                    }
                    setChecking(false);
                } else {
                    // Other error (server down etc)
                    console.error("Profile check failed", response);
                    setChecking(false); // Let it render, might show error later
                }
            } catch (e) {
                console.error("Profile check error", e);
                setChecking(false);
            }
        };

        checkProfile();
    }, [location.pathname, navigate]);

    // Loading state while checking auth/profile
    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen relative overflow-hidden bg-background">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-gradient-to-br from-background via-emerald-50/30 to-emerald-100/20 dark:from-background dark:via-emerald-950/10 dark:to-emerald-900/5" />

            {/* Fixed Header */}
            <StudentHeader />

            {/* Main Content Area */}
            {/* Added pt-24 to account for the fixed header height */}
            <div className="relative z-10 pt-24">
                <Outlet />
            </div>

            {/* Floating Contact Button - Hide on contact page */}
            {location.pathname !== '/contact-admin' && <ContactAdminModal />}
        </div>
    );
};

export default StudentLayout;
