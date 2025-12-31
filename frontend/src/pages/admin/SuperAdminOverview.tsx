import { ChatInterface } from "@/components/ChatInterface";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Building2, Check, CheckCircle, Clock, FileText, Loader2, MessageSquare, TrendingUp, Users, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

interface PlatformStats {
    total_institutions: number;
    pending_institutions: number;
    approved_institutions: number;
    rejected_institutions: number;
    total_students: number;
    total_admins: number;
}

interface RecentActivity {
    id: string;
    type: 'institution_registered' | 'institution_approved' | 'institution_rejected' | 'student_request';
    title: string;
    description: string;
    timestamp: string;
    status?: string; // For pending logic
    institution?: any; // To pass to approve logic if needed
}

interface AdminContact {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    last_message_at?: string;
    unread_count?: number;
    type: 'admin';
}

const SuperAdminOverview = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [reportLoading, setReportLoading] = useState(false);
    const [stats, setStats] = useState<PlatformStats>({
        total_institutions: 0,
        pending_institutions: 0,
        approved_institutions: 0,
        rejected_institutions: 0,
        total_students: 0,
        total_admins: 0
    });
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const [latestAdmin, setLatestAdmin] = useState<AdminContact | null>(null);
    const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);

    useEffect(() => {
        fetchPlatformStats();
        fetchCurrentAdmin();
        fetchLatestAdminChat();
    }, []);

    const fetchCurrentAdmin = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) return;

            const response = await fetch(`${API_BASE}/api/admin/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setCurrentAdminId(data.id);
            }
        } catch (error) {
            console.error("Failed to fetch admin info", error);
        }
    };

    const fetchLatestAdminChat = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) return;

            // Reuse the chat/admins endpoint which returns unread counts and last message time
            const response = await fetch(`${API_BASE}/api/chat/admins`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const adminsData = await response.json();

                // Filter out super admins and sort by last_message_at
                const sortedAdmins = adminsData
                    .filter((a: any) => a.role !== 'super_admin')
                    .sort((a: any, b: any) => {
                        const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
                        const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
                        return timeB - timeA;
                    });

                // If we have any admins, pick the top one as the "latest" interaction
                // Even if no messages yet, just showing the first one is better than nothing, 
                // but user asked for "latest admin conversation".
                // If no conversations at all (all time 0), maybe pick the first one anyway?
                // Let's pick the first one if length > 0.
                if (sortedAdmins.length > 0) {
                    setLatestAdmin({
                        ...sortedAdmins[0],
                        type: 'admin'
                    });
                }
            }
        } catch (error) {
            console.error("Failed to fetch latest admin chat", error);
        }
    };

    const fetchPlatformStats = async () => {
        try {
            setLoading(true);

            // Fetch all institutions to calculate stats
            const response = await fetch(`${API_BASE}/api/institutions/all`);
            if (!response.ok) throw new Error('Failed to fetch data');
            const institutions = await response.json();

            // Calculate stats from institutions
            const newStats: PlatformStats = {
                total_institutions: institutions.length,
                pending_institutions: institutions.filter((i: any) => i.status === 'pending').length,
                approved_institutions: institutions.filter((i: any) => i.status === 'approved').length,
                rejected_institutions: institutions.filter((i: any) => i.status === 'rejected').length,
                total_students: 0, // Would need separate endpoint
                total_admins: institutions.reduce((acc: number, i: any) => acc + (i.institution_admins?.length || 0), 0)
            };
            setStats(newStats);

            // Build recent activity - Prioritize Pending for "Approval Requests" feel
            const sortedInstitutions = [...institutions].sort((a: any, b: any) => {
                // Pending first, then by date
                if (a.status === 'pending' && b.status !== 'pending') return -1;
                if (a.status !== 'pending' && b.status === 'pending') return 1;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });

            const activities: RecentActivity[] = sortedInstitutions
                .slice(0, 5)
                .map((inst: any) => ({
                    id: inst.id,
                    type: inst.status === 'pending' ? 'institution_registered'
                        : inst.status === 'approved' ? 'institution_approved'
                            : 'institution_rejected',
                    title: inst.name,
                    description: `${inst.type} - ${inst.state || 'Unknown location'}`,
                    timestamp: inst.created_at,
                    status: inst.status,
                    institution: inst
                }));
            setRecentActivity(activities);

        } catch (error) {
            console.error('Error:', error);
            toast({
                title: "Error",
                description: "Failed to load platform statistics",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateReport = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) {
                toast({
                    title: "Authentication Error",
                    description: "You must be logged in to generate reports.",
                    variant: "destructive"
                });
                return;
            }

            setReportLoading(true);
            // Call new analytics endpoint
            const response = await fetch(`${API_BASE}/api/super-admin/reports/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ report_type: 'general' })
            });

            if (!response.ok) throw new Error('Failed to generate report');
            const data = await response.json();

            // Trigger Download
            const blob = new Blob([data.report_content], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `AI_Platform_Report_${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // Show report content in a nice toast for now, or modal
            toast({
                title: "AI Report Generated",
                description: "Report has been generated successfully.",
                variant: "default",
                duration: 5000,
            });
            // In a real app, maybe open a modal with 'data.report_content'
            console.log("Report:", data.report_content);

        } catch (error) {
            toast({
                title: "Generation Failed",
                description: "Could not generate AI report.",
                variant: "destructive"
            });
        } finally {
            setReportLoading(false);
        }
    };

    const handleQuickApprove = (id: string, name: string) => {
        navigate("/admin/institutions");
        toast({
            title: "Redirecting...",
            description: `Redirecting to approve ${name}.`,
        });
    };

    const statCards = [
        {
            label: "Total Institutions",
            value: stats.total_institutions,
            icon: Building2,
            color: "bg-blue-500",
            subtext: `${stats.approved_institutions} approved`
        },
        {
            label: "Pending Review",
            value: stats.pending_institutions,
            icon: Clock,
            color: "bg-yellow-500",
            subtext: "Awaiting approval"
        },
        {
            label: "Total Admins",
            value: stats.total_admins,
            icon: Users,
            color: "bg-emerald-500",
            subtext: "Institution admins"
        },
        {
            label: "Platform Growth",
            value: `+${Math.round((stats.approved_institutions / Math.max(stats.total_institutions, 1)) * 100)}%`,
            icon: TrendingUp,
            color: "bg-purple-500",
            subtext: "Approval rate"
        },
    ];

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'institution_registered':
                return <Clock className="w-4 h-4 text-yellow-500" />;
            case 'institution_approved':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'institution_rejected':
                return <XCircle className="w-4 h-4 text-red-500" />;
            default:
                return <Activity className="w-4 h-4 text-gray-500" />;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Overview</h1>
                    <p className="text-gray-600 dark:text-gray-400">Welcome to the Super Admin Dashboard</p>
                </div>

            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <AnimatePresence>
                    {statCards.map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="hover:shadow-md transition-shadow">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{stat.subtext}</p>
                                        </div>
                                        <div className={`p-3 rounded-full ${stat.color}`}>
                                            <stat.icon className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Recent Activity & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity / Approval Requests */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Latest Activity & Approvals</CardTitle>
                        <CardDescription>Recent registrations seeking approval</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {recentActivity.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No recent activity</p>
                        ) : (
                            <div className="space-y-4">
                                {recentActivity.map((activity) => (
                                    <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            {getActivityIcon(activity.type)}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 dark:text-white truncate">{activity.title}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{activity.description}</p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                    {new Date(activity.timestamp).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        {activity.status === 'pending' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="ml-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                                onClick={() => handleQuickApprove(activity.id, activity.title)}
                                            >
                                                <Check className="w-4 h-4 mr-1" />
                                                Review
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Quick Actions</CardTitle>
                        <CardDescription>Common administrative tasks</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-3">

                            {latestAdmin && currentAdminId ? (
                                <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
                                    <DialogTrigger asChild>
                                        <button
                                            className="flex flex-col items-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors w-full h-full text-left"
                                        >
                                            <MessageSquare className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mb-2" />
                                            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                                                Contact {latestAdmin.first_name}
                                            </span>
                                            {latestAdmin.unread_count && latestAdmin.unread_count > 0 ? (
                                                <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full absolute top-2 right-2">
                                                    {latestAdmin.unread_count}
                                                </span>
                                            ) : null}
                                        </button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-md p-0 overflow-hidden">
                                        <div className="h-[500px] w-full">
                                            <ChatInterface
                                                currentUserId={currentAdminId}
                                                currentUserType="admin"
                                                targetUserId={latestAdmin.id}
                                                targetUserType="admin"
                                                targetUserName={`${latestAdmin.first_name} ${latestAdmin.last_name}`}
                                                isExpanded={true} // So it fits the container
                                            />
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            ) : (
                                <a
                                    href="/admin/contact-admin"
                                    className="flex flex-col items-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                                >
                                    <MessageSquare className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mb-2" />
                                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Contact Admins</span>
                                </a>
                            )}

                            <button
                                onClick={handleGenerateReport}
                                disabled={reportLoading}
                                className="flex flex-col items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors w-full h-full text-left"
                            >
                                {reportLoading ? (
                                    <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-2 animate-spin" />
                                ) : (
                                    <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-2" />
                                )}
                                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Generate AI Report</span>
                            </button>
                            <a
                                href="/admin/platform-reports"
                                className="flex flex-col items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                            >
                                <TrendingUp className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-2" />
                                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Platform Reports</span>
                            </a>
                            <a
                                href="/admin/platform-settings"
                                className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <Users className="w-8 h-8 text-gray-600 dark:text-gray-400 mb-2" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Platform Settings</span>
                            </a>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default SuperAdminOverview;
