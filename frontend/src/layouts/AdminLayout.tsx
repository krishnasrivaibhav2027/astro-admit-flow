import { AdminHeader } from "@/components/AdminHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
    Activity,
    BarChart3,
    Database,
    FileText,
    LayoutDashboard,
    Megaphone,
    Menu,
    MessageSquare,
    Settings,
    Users,
    X
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
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

            // 1. Check if user is in 'admins' table (Primary Source of Truth for Admins)
            const { data: adminData } = await supabase
                .from("admins")
                .select("*")
                .eq("email", email)
                .maybeSingle();

            if (adminData) {
                // User is definitely an admin

                // Check for profile completeness (e.g. phone number)
                // Exception: Don't redirect if already on the profile page
                if (!adminData.phone && location.pathname !== '/admin/profile') {
                    toast({
                        title: "Profile Incomplete",
                        description: "Please complete your admin profile to continue.",
                    });
                    navigate("/admin/profile");
                    // We still set isAdmin to true to render the layout, 
                    // but the navigate happens immediately.
                    // Actually, we should probably let the layout render so the Outlet (Profile) can show?
                    // If we navigate, the component re-renders.
                }

                setIsAdmin(true);
                return;
            }

            // 2. Fallback: Check 'students' table (Legacy or mixed roles)
            const { data: studentData, error } = await supabase
                .from("students")
                .select("role")
                .eq("email", email)
                .maybeSingle();

            if (error || (studentData as any)?.role !== 'admin') {
                const domain = email.split('@')[1];
                const allowedDomains = ["admin.com", "institution.edu"];

                if (!allowedDomains.includes(domain) && (studentData as any)?.role !== 'admin') {
                    throw new Error("Not authorized");
                }
            }

            setIsAdmin(true);
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

    const navItems = [
        { icon: LayoutDashboard, label: "Overview", path: "/admin" },
        { icon: Database, label: "Question Bank", path: "/admin/question-bank" },
        { icon: BarChart3, label: "Question Analytics", path: "/admin/questions" },

        { icon: Activity, label: "Live Monitoring", path: "/admin/monitoring" },
        { icon: Users, label: "Students", path: "/admin/students" },
        { icon: FileText, label: "Reports", path: "/admin/reports" },
        { icon: Megaphone, label: "Announcements", path: "/admin/announcements" },
        { icon: MessageSquare, label: "Contact Student", path: "/admin/contact" },
        { icon: Settings, label: "Settings", path: "/admin/settings" },
    ];

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading admin panel...</div>;
    }

    if (!isAdmin) return null;

    const isProfilePage = location.pathname === "/admin/profile";

    return (
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
    );
};

export default AdminLayout;
