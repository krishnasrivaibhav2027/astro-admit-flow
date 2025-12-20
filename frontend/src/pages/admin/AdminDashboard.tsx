import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminStats } from "@/hooks/useAppQueries";
import { Activity, AlertCircle, CheckCircle2, Database, Loader2, Users, Zap } from "lucide-react";

interface DashboardStats {
    total_students: number;
    active_tests: number;
    questions_in_bank: number;
    flagged_issues: number;
}

const AdminDashboard = () => {
    const { data, isLoading: loading } = useAdminStats();
    const stats = data?.stats || null;
    const activities = data?.activities || [];

    const statCards = [
        {
            title: "Total Students",
            value: stats?.total_students ?? 0,
            icon: Users,
            description: "Registered users",
            color: "text-emerald-500",
            bgColor: "bg-emerald-500/10",
            borderColor: "border-emerald-500/20"
        },
        {
            title: "Active Tests",
            value: stats?.active_tests ?? 0,
            icon: Zap,
            description: "In last 24 hours",
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
            borderColor: "border-blue-500/20"
        },
        {
            title: "Questions in Bank",
            value: stats?.questions_in_bank ?? 0,
            icon: Database,
            description: "Total available",
            color: "text-purple-500",
            bgColor: "bg-purple-500/10",
            borderColor: "border-purple-500/20"
        },
        {
            title: "Flagged Issues",
            value: stats?.flagged_issues ?? 0,
            icon: AlertCircle,
            description: "Requires attention",
            color: "text-yellow-500",
            bgColor: "bg-yellow-500/10",
            borderColor: "border-yellow-500/20"
        },
    ];

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, index) => (
                    <Card key={index} className={`border bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-colors ${stat.borderColor}`}>
                        <CardContent className="p-6">
                            <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center mb-4`}>
                                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-3xl font-bold">{stat.value}</h2>
                                <p className="text-sm font-medium text-foreground">{stat.title}</p>
                                <p className="text-xs text-muted-foreground">{stat.description}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <Card className="col-span-1 border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center gap-2">
                        <div className="p-2 rounded-lg bg-emerald-500/10">
                            <Activity className="h-4 w-4 text-emerald-500" />
                        </div>
                        <CardTitle className="text-base">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 h-[200px] overflow-y-auto pr-2 flex flex-col custom-scrollbar">
                            {activities.length > 0 ? (
                                activities.map((activity, i) => (
                                    <div key={i} className="flex items-center gap-4 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                                        <div className={`w-2 h-2 rounded-full ${activity.type === 'message' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                                        <div>
                                            <p className="text-sm font-medium">{activity.message}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(activity.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
                                    <div className="p-4 rounded-full bg-muted/20">
                                        <Activity className="h-8 w-8 opacity-20" />
                                    </div>
                                    <p className="text-sm">No recent activity.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* System Health */}
                <Card className="col-span-1 border-border/50 bg-card/50 backdrop-blur-sm h-fit">
                    <CardHeader className="flex flex-row items-center gap-2">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <Activity className="h-4 w-4 text-blue-500" />
                        </div>
                        <CardTitle className="text-base">System Health</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    <span className="text-sm font-medium">Database Status</span>
                                </div>
                                <span className="text-xs font-medium text-emerald-500 px-2 py-1 rounded-full bg-emerald-500/10">
                                    Healthy
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    <span className="text-sm font-medium">API Latency</span>
                                </div>
                                <span className="text-xs font-medium text-emerald-500 px-2 py-1 rounded-full bg-emerald-500/10">
                                    45ms
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    <span className="text-sm font-medium">AI Service</span>
                                </div>
                                <span className="text-xs font-medium text-emerald-500 px-2 py-1 rounded-full bg-emerald-500/10">
                                    Operational
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AdminDashboard;
