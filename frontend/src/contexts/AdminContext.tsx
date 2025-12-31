import { supabase } from "@/integrations/supabase/client";
import React, { createContext, useContext, useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

interface AdminInfo {
    name: string;
    email: string;
    adminType: 'super_admin' | 'institution_admin' | 'legacy_admin' | null;
    institutionId: string | null;
    institutionName: string | null;
    institutionWebsite: string | null;
}

interface AdminContextType {
    adminInfo: AdminInfo | null;
    loading: boolean;
    refreshAdminInfo: () => Promise<void>;
    updateAdminName: (name: string) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const useAdmin = () => {
    const context = useContext(AdminContext);
    if (!context) {
        throw new Error("useAdmin must be used within an AdminProvider");
    }
    return context;
};

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchAdminInfo = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.email) {
                setLoading(false);
                return;
            }

            const email = session.user.email;

            // Use API endpoint to get admin info (bypasses RLS)
            try {
                const response = await fetch(
                    `${API_BASE}/api/institutions/check-admin-type?email=${encodeURIComponent(email)}`
                );
                if (response.ok) {
                    const data = await response.json();

                    let name = data.name;

                    // Fallback to Google OAuth metadata if no name
                    if (!name) {
                        const user = session.user;
                        name = user.user_metadata?.full_name ||
                            user.user_metadata?.name ||
                            email.split('@')[0];
                    }

                    setAdminInfo({
                        name,
                        email,
                        adminType: data.admin_type,
                        institutionId: data.institution_id,
                        institutionName: data.institution_name,
                        institutionWebsite: data.institution_website
                    });
                }
            } catch (apiError) {
                console.error("API check failed:", apiError);
                // Fallback to basic info
                const user = session.user;
                setAdminInfo({
                    name: user.user_metadata?.full_name || email.split('@')[0],
                    email,
                    adminType: null,
                    institutionId: null,
                    institutionName: null,
                    institutionWebsite: null
                });
            }
        } catch (error) {
            console.error("Error fetching admin info:", error);
        } finally {
            setLoading(false);
        }
    };

    const refreshAdminInfo = async () => {
        setLoading(true);
        await fetchAdminInfo();
    };

    const updateAdminName = (name: string) => {
        if (adminInfo) {
            setAdminInfo({ ...adminInfo, name });
        }
    };

    useEffect(() => {
        fetchAdminInfo();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            fetchAdminInfo();
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <AdminContext.Provider value={{ adminInfo, loading, refreshAdminInfo, updateAdminName }}>
            {children}
        </AdminContext.Provider>
    );
};
