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
            const token = localStorage.getItem("firebase_token");
            if (!token) {
                throw new Error("No token found");
            }

            // Decode token to get email (simplified)
            const payload = JSON.parse(atob(token.split('.')[1]));
            const email = payload.email;

            // Check role in Supabase
            const { data, error } = await supabase
                .from("students")
                .select("role")
                .eq("email", email)
                .single();

            if (error || (data as any)?.role !== 'admin') {
                // Also check domain as fallback (client-side check, backend verifies strictly)
                const domain = email.split('@')[1];
                // Fetch allowed domains (mocked for now, ideally fetch from backend)
                const allowedDomains = ["admin.com", "institution.edu"];

                if (!allowedDomains.includes(domain) && (data as any)?.role !== 'admin') {
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
            const token = localStorage.getItem("firebase_token");
            if (token) {
                const backendUrl = import.meta.env.VITE_BACKEND_URL;
                // Decode token to get email
                const payload = JSON.parse(atob(token.split('.')[1]));
                const email = payload.email;

                await fetch(`${backendUrl}/api/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ email })
                });
            }
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            localStorage.removeItem("firebase_token");
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

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <AdminHeader />

            <div className="flex flex-1 pt-[88px]">
                {/* Sidebar */}
                <aside
                    className={`${isSidebarOpen ? "w-64" : "w-20"
                        } bg-card border-r transition-all duration-300 flex flex-col fixed left-0 top-[88px] h-[calc(100vh-88px)] z-40`}
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

                {/* Main Content */}
                <main
                    className={`flex-1 transition-all duration-300 ${isSidebarOpen ? "ml-64" : "ml-20"
                        } p-8`}
                >
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
