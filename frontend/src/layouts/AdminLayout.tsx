import { AdminHeader } from "@/components/AdminHeader";
import { Button } from "@/components/ui/button";
import { AdminProvider } from "@/contexts/AdminContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
    Activity,
    BarChart3,
    Building2,
    Database,
    FileText,
    LayoutDashboard,
    Megaphone,
    Menu,
    MessageSquare,
    Settings,
    UserCheck,
    Users,
    X
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

interface AdminInfo {
    is_admin: boolean;
    admin_type: 'super_admin' | 'institution_admin' | 'legacy_admin' | null;
    name: string | null;
    institution_id: string | null;
    institution_name?: string;
}

const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAdminStatus();
    }, []);

    const checkAdminStatus = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                throw new Error("No session found");
            }

            const email = session.user.email;
            if (!email) throw new Error("No email found");

            // Use API to check admin type (bypasses RLS issues)
            const response = await fetch(`${API_BASE}/api/institutions/check-admin-type?email=${encodeURIComponent(email)}`);

            if (!response.ok) {
                throw new Error("Failed to check admin status");
            }

            const data: AdminInfo = await response.json();

            if (!data.is_admin) {
                throw new Error("Not authorized");
            }

            setAdminInfo(data);
            setIsAdmin(true);

            // Profile completeness check for legacy admins
            if (data.admin_type === 'legacy_admin' && location.pathname !== '/admin/profile') {
                const { data: adminData } = await supabase
                    .from("admins")
                    .select("phone")
                    .eq("email", email)
                    .maybeSingle();

                if (adminData && !adminData.phone) {
                    toast({
                        title: "Profile Incomplete",
                        description: "Please complete your admin profile to continue.",
                    });
                    navigate("/admin/profile");
                }
            }
        } catch (error) {
            console.error("Admin check failed:", error);
            toast({
                title: "Access Denied",
                description: "You do not have admin privileges.",
                variant: "destructive",
            });
            navigate("/");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            localStorage.removeItem("firebase_token");
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            navigate("/");
        }
    };

    // ============================================
    // SUPER ADMIN NAVIGATION (Platform-level only)
    // ============================================
    const superAdminNavItems = [
        { icon: LayoutDashboard, label: "Platform Overview", path: "/admin" },
        { icon: Building2, label: "Institutions", path: "/admin/institutions" },
        { icon: Activity, label: "Global Monitoring", path: "/admin/global-monitoring" },
        { icon: FileText, label: "Platform Reports", path: "/admin/platform-reports" },
        { icon: MessageSquare, label: "Contact Admins", path: "/admin/contact-admin" },
        { icon: Settings, label: "Platform Settings", path: "/admin/platform-settings" },
    ];

    // ============================================
    // INSTITUTION ADMIN NAVIGATION (Institution-specific)
    // ============================================
    const institutionAdminNavItems = [
        { icon: LayoutDashboard, label: "Overview", path: "/admin" },
        { icon: UserCheck, label: "Student Requests", path: "/admin/student-requests" },
        { icon: Database, label: "Question Bank", path: "/admin/question-bank" },
        { icon: BarChart3, label: "Question Analytics", path: "/admin/questions" },
        { icon: Activity, label: "Live Monitoring", path: "/admin/monitoring" },
        { icon: Users, label: "Students", path: "/admin/students" },
        { icon: FileText, label: "Reports", path: "/admin/reports" },
        { icon: Megaphone, label: "Announcements", path: "/admin/announcements" },
        { icon: MessageSquare, label: "Contact Student", path: "/admin/contact" },
        { icon: Settings, label: "Settings", path: "/admin/settings" },
    ];

    // ============================================
    // LEGACY ADMIN NAVIGATION (Same as super admin)
    // ============================================
    const legacyAdminNavItems = superAdminNavItems;

    // Select nav items based on admin type
    const getNavItems = () => {
        if (adminInfo?.admin_type === 'super_admin') {
            return superAdminNavItems;
        } else if (adminInfo?.admin_type === 'institution_admin') {
            return institutionAdminNavItems;
        } else if (adminInfo?.admin_type === 'legacy_admin') {
            return legacyAdminNavItems;
        }
        return institutionAdminNavItems; // Default fallback
    };

    const navItems = getNavItems();

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading admin panel...</div>;
    }

    if (!isAdmin) return null;

    const isProfilePage = location.pathname === "/admin/profile";

    return (
        <AdminProvider>
            <div className="min-h-screen bg-background flex flex-col">
                <AdminHeader />

                <div className="flex flex-1 pt-[88px]">
                    {/* Sidebar - Hide if on Profile Page */}
                    {!isProfilePage && (
                        <aside
                            className={`${isSidebarOpen ? "w-64" : "w-20"} bg-card border-r transition-all duration-300 flex flex-col fixed left-0 top-[88px] h-[calc(100vh-88px)] z-40`}
                        >
                            <div className="p-4 flex items-center justify-between border-b">
                                {isSidebarOpen && <span className="font-bold text-lg">Admin Console</span>}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                >
                                    {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                                </Button>
                            </div>

                            <nav className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
                                {navItems.map((item) => (
                                    <Link to={item.path} key={item.path}>
                                        <Button
                                            variant="ghost"
                                            className={`w-full justify-start ${!isSidebarOpen && "justify-center px-2"} transition-all duration-200 
                                                ${location.pathname === item.path
                                                    ? "bg-emerald-500 text-white hover:bg-emerald-600 hover:text-white dark:bg-emerald-500/10 dark:text-emerald-500 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-500 dark:border dark:border-emerald-500/20"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                                }`}
                                        >
                                            <item.icon className={`h-5 w-5 ${isSidebarOpen && "mr-2"}`} />
                                            {isSidebarOpen && <span>{item.label}</span>}
                                        </Button>
                                    </Link>
                                ))}
                            </nav>
                        </aside>
                    )}

                    {/* Main Content */}
                    <main
                        className={`flex-1 transition-all duration-300 
                            ${!isProfilePage ? (isSidebarOpen ? "ml-64" : "ml-20") : "ml-0"} 
                            p-8`}
                    >
                        <Outlet />
                    </main>
                </div>
            </div>
        </AdminProvider>
    );
};

export default AdminLayout;
