import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, BarChart3, Brain, FileText, Loader2, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface ComprehensiveReport {
    performance_trends: { date: string; average_score: number }[];
    engagement_stats: {
        total_students: number;
        active_last_7_days: number;
        inactive_count: number;
    };
    difficult_questions: {
        question_text: string;
        correct_rate: number;
        attempts: number;
    }[];
    stuck_students: {
        id: string;
        name: string;
        reason: string;
        value: string;
    }[];
}

const Reports = () => {
    const [data, setData] = useState<ComprehensiveReport | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const backendUrl = import.meta.env.VITE_BACKEND_URL;

            const response = await fetch(`${backendUrl}/api/admin/reports/comprehensive`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error("Failed to fetch reports");

            const reportData = await response.json();
            setData(reportData);
        } catch (error) {
            console.error("Error:", error);
            toast({
                title: "Error",
                description: "Failed to load reports data",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
                <AlertTriangle className="h-12 w-12 text-red-500" />
                <h3 className="text-lg font-semibold">Failed to load reports</h3>
                <p className="text-muted-foreground">There was an error fetching the data. Please try again.</p>
                <Button onClick={fetchReports} variant="outline">Retry</Button>
            </div>
        );
    }

    // Prepare Engagement Data for Chart
    const engagementData = [
        { name: 'Active (7d)', value: data.engagement_stats.active_last_7_days, color: '#10b981' }, // emerald-500
        { name: 'Inactive', value: data.engagement_stats.inactive_count, color: '#64748b' }, // slate-500
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Comprehensive Reports</h1>
                    <p className="text-muted-foreground">AI-powered insights and performance analytics</p>
                </div>
                <Button
                    onClick={() => navigate("/admin/reports/detailed")}
                    variant="outline"
                    className="bg-indigo-500 text-white border-indigo-500 hover:bg-indigo-600 hover:text-white dark:bg-indigo-500/10 dark:text-indigo-500 dark:border-indigo-500/20 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-500"
                >
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Report
                </Button>
            </div>

            {/* AI Insights Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
                    <CardHeader className="flex flex-row items-center gap-2 pb-2">
                        <Brain className="h-5 w-5 text-indigo-500" />
                        <CardTitle className="text-base text-indigo-500">AI Performance Insight</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm font-medium">
                            {data.performance_trends.length > 1 && data.performance_trends[data.performance_trends.length - 1].average_score > data.performance_trends[0].average_score
                                ? "Student performance is trending upwards. Consider increasing difficulty for top performers."
                                : "Performance has stabilized. Focus on reinforcing core concepts for struggling students."}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
                    <CardHeader className="flex flex-row items-center gap-2 pb-2">
                        <Brain className="h-5 w-5 text-emerald-500" />
                        <CardTitle className="text-base text-emerald-500">AI Engagement Insight</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm font-medium">
                            {data.engagement_stats.active_last_7_days / data.engagement_stats.total_students > 0.5
                                ? "High engagement levels detected. Best time to launch new challenges."
                                : "Engagement is lower than average. Consider sending a re-engagement announcement."}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Performance Trend */}
                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-emerald-500" />
                            Performance Trend
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.performance_trends} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} />
                                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }}
                                />
                                <Line type="monotone" dataKey="average_score" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: "#10b981" }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Engagement Stats */}
                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-500" />
                            Student Engagement
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={engagementData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#333" opacity={0.1} />
                                <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis dataKey="name" type="category" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} width={100} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={40}>
                                    {engagementData.map((entry, index) => (
                                        <Cell key={`cell - ${index} `} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Tables Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Difficult Questions */}
                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Difficult Questions
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data.difficult_questions.length > 0 ? (
                                data.difficult_questions.map((q, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50">
                                        <div className="space-y-1 flex-1 mr-4">
                                            <p className="text-sm font-medium line-clamp-1" title={q.question_text}>{q.question_text}</p>
                                            <p className="text-xs text-muted-foreground">{q.attempts} attempts</p>
                                        </div>
                                        <Badge variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20">
                                            {q.correct_rate}% Correct
                                        </Badge>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">No difficult questions flagged.</div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Stuck Students */}
                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-orange-500" />
                            Stuck Students
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data.stuck_students.length > 0 ? (
                                data.stuck_students.map((s, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium">{s.name}</p>
                                            <p className="text-xs text-muted-foreground">ID: {s.id.slice(0, 8)}</p>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant="outline" className="mb-1 border-orange-500/20 text-orange-500">
                                                {s.reason}
                                            </Badge>
                                            <p className="text-xs font-bold text-foreground">{s.value}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">No stuck students detected.</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Reports;
