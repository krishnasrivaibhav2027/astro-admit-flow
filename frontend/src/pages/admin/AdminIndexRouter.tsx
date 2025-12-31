import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import AdminDashboard from "./AdminDashboard";
import SuperAdminOverview from "./SuperAdminOverview";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

/**
 * AdminIndexRouter - Conditionally renders the appropriate dashboard
 * based on the admin type (super_admin vs institution_admin)
 */
const AdminIndexRouter = () => {
    const [loading, setLoading] = useState(true);
    const [adminType, setAdminType] = useState<string | null>(null);

    useEffect(() => {
        checkAdminType();
    }, []);

    const checkAdminType = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.email) {
                setLoading(false);
                return;
            }

            const response = await fetch(
                `${API_BASE}/api/institutions/check-admin-type?email=${encodeURIComponent(session.user.email)}`
            );

            if (response.ok) {
                const data = await response.json();
                setAdminType(data.admin_type);
            }
        } catch (error) {
            console.error("Error checking admin type:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    // Super admins and legacy admins see platform overview
    if (adminType === 'super_admin' || adminType === 'legacy_admin') {
        return <SuperAdminOverview />;
    }

    // Institution admins see their institution dashboard
    return <AdminDashboard />;
};

export default AdminIndexRouter;
