import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Activity, Clock, Loader2, RefreshCw, Search, User, Zap } from "lucide-react";
import { useEffect, useState } from "react";

interface LiveSession {
    id: string;
    student_id: string;
    levels_status: {
        easy: 'locked' | 'pending' | 'in_progress' | 'completed' | 'failed';
        medium: 'locked' | 'pending' | 'in_progress' | 'completed' | 'failed';
        hard: 'locked' | 'pending' | 'in_progress' | 'completed' | 'failed';
    };
    status: 'active' | 'inactive';
    last_active_at: string | null;
    logout_time: string | null;
    students: {
        first_name: string;
        last_name: string;
        email: string;
    };
}

const LiveMonitoring = () => {
    const [sessions, setSessions] = useState<LiveSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const { toast } = useToast();

    const fetchLiveSessions = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("firebase_token");
            const backendUrl = import.meta.env.VITE_BACKEND_URL;

            const response = await fetch(`${backendUrl}/api/admin/monitoring/live`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error("Failed to fetch live sessions");

            const data = await response.json();
            setSessions(data);
        } catch (error) {
            console.error("Error:", error);
            toast({
                title: "Error",
                description: "Failed to refresh live monitoring",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLiveSessions();
        const interval = setInterval(fetchLiveSessions, 10000); // Auto-refresh every 10s
        return () => clearInterval(interval);
    }, []);

    // --- Stats Calculation ---
    const totalStudents = sessions.length || 1; // Avoid division by zero
    const activeSessions = sessions.filter(s => s.status === 'active').length;
    const testsInProgress = sessions.filter(s =>
        Object.values(s.levels_status).some(status => status === 'in_progress')
    ).length;
    const completedTests = sessions.filter(s =>
        Object.values(s.levels_status).every(status => status === 'completed' || status === 'failed')
    ).length;

    // --- Filtering ---
    const filteredSessions = sessions.filter(session => {
        const matchesSearch =
            session.students.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            session.students.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            session.students.email.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "all"
            ? true
            : statusFilter === "online"
                ? session.status === 'active'
                : session.status === 'inactive';

        return matchesSearch && matchesStatus;
    });

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'; // Pass
            case 'failed': return 'bg-red-500/10 text-red-500 border-red-500/20'; // Fail
            case 'in_progress': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'; // Active
            case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'; // Open
            default: return 'bg-muted/50 text-muted-foreground border-border/50'; // Locked
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'completed': return 'Pass';
            case 'failed': return 'Fail';
            case 'in_progress': return 'Active';
            case 'pending': return 'Open';
            default: return 'Locked';
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Live Monitoring</h1>
                    <p className="text-muted-foreground">Real-time view of active test sessions</p>
                </div>
                <Button
                    onClick={fetchLiveSessions}
                    disabled={loading}
                    variant="outline"
                    className="bg-emerald-500 text-white border-emerald-500 hover:bg-white hover:text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500 dark:border-emerald-500/20 dark:hover:bg-white dark:hover:text-emerald-500"
                >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-sm font-medium text-muted-foreground">Active Sessions</span>
                            <Activity className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div className="flex items-end gap-2 mb-2">
                            <span className="text-3xl font-bold">{activeSessions}</span>
                            <span className="text-sm text-muted-foreground mb-1">/ {sessions.length}</span>
                        </div>
                        <Progress value={(activeSessions / totalStudents) * 100} className="h-1.5 bg-emerald-500/20" indicatorClassName="bg-emerald-500" />
                    </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-sm font-medium text-muted-foreground">Tests in Progress</span>
                            <Zap className="h-4 w-4 text-amber-500" />
                        </div>
                        <div className="flex items-end gap-2 mb-2">
                            <span className="text-3xl font-bold">{testsInProgress}</span>
                            <span className="text-sm text-muted-foreground mb-1">/ {sessions.length}</span>
                        </div>
                        <Progress value={(testsInProgress / totalStudents) * 100} className="h-1.5 bg-amber-500/20" indicatorClassName="bg-amber-500" />
                    </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-sm font-medium text-muted-foreground">Completed</span>
                            <Activity className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="flex items-end gap-2 mb-2">
                            <span className="text-3xl font-bold">{completedTests}</span>
                            <span className="text-sm text-muted-foreground mb-1">/ {sessions.length}</span>
                        </div>
                        <Progress value={(completedTests / totalStudents) * 100} className="h-1.5 bg-blue-500/20" indicatorClassName="bg-blue-500" />
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or email..."
                        className="pl-10 bg-card/50 border-border/50"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px] bg-card/50 border-border/50">
                        <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="offline">Offline</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Student Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSessions.map((session) => (
                    <Card key={session.id} className="bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden hover:border-emerald-500/30 transition-all duration-300">
                        <CardContent className="p-6 space-y-6">
                            {/* Header */}
                            <div className="flex justify-between items-start gap-2">
                                <div className="flex gap-4 min-w-0">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 flex-shrink-0">
                                        <User className="h-6 w-6" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-lg leading-none mb-1 truncate">
                                            {session.students.first_name} {session.students.last_name}
                                        </h3>
                                        <p className="text-sm text-muted-foreground truncate">{session.students.email}</p>
                                    </div>
                                </div>
                                <Badge
                                    variant="outline"
                                    className={`flex-shrink-0 ${session.status === 'active'
                                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                        : 'bg-muted/50 text-muted-foreground border-border/50'}`}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full mr-2 ${session.status === 'active' ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                                    {session.status === 'active' ? 'Online' : 'Offline'}
                                </Badge>
                            </div>

                            {/* Level Status Rows */}
                            <div className="space-y-3">
                                {(['easy', 'medium', 'hard'] as const).map((level) => {
                                    const status = session.levels_status?.[level] || 'locked';
                                    return (
                                        <div key={level} className="flex items-center justify-between">
                                            <span className="text-xs font-medium uppercase text-muted-foreground w-16">{level}</span>
                                            <div className={`flex-1 py-2 px-4 rounded-lg text-center text-sm font-medium border ${getStatusStyle(status)}`}>
                                                {getStatusLabel(status)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Footer */}
                            <div className="pt-4 border-t border-border/50 space-y-2">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span>Last Activity:</span>
                                    </div>
                                    <span className="font-medium text-foreground">
                                        {session.last_active_at ? new Date(session.last_active_at).toLocaleTimeString() : 'N/A'}
                                    </span>
                                </div>
                                {session.logout_time && (
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5" />
                                            <span>Logged Out:</span>
                                        </div>
                                        <span className="font-medium text-foreground">
                                            {new Date(session.logout_time).toLocaleTimeString()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {filteredSessions.length === 0 && !loading && (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground bg-card/30 rounded-xl border border-dashed border-border/50">
                        <div className="p-4 rounded-full bg-muted/20 mb-3">
                            <Search className="h-8 w-8 opacity-20" />
                        </div>
                        <p>No active sessions found matching your criteria.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LiveMonitoring;
