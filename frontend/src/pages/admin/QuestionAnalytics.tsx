import { SubjectDifficultyHeatmap } from "@/components/analytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download, Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface QuestionStat {
    question_id: string;
    question_text: string;
    level: string;
    attempt_count: number;
    correct_percentage: number;
}

const COLORS = {
    Easy: '#00C49F',
    Medium: '#FFBB28',
    Hard: '#FF8042',
    Unknown: '#8884d8'
};

const QuestionAnalytics = () => {
    const [stats, setStats] = useState<QuestionStat[]>([]);
    const [levelStats, setLevelStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const { toast } = useToast();

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const headers = { 'Authorization': `Bearer ${token}` };

            const [questionsRes, levelsRes] = await Promise.all([
                fetch(`${backendUrl}/api/admin/stats/questions`, { headers }),
                fetch(`${backendUrl}/api/admin/stats/levels`, { headers })
            ]);

            if (!questionsRes.ok || !levelsRes.ok) throw new Error("Failed to fetch stats");

            const questionsData = await questionsRes.json();
            const levelsData = await levelsRes.json();

            setStats(questionsData);
            setLevelStats(levelsData);
        } catch (error) {
            console.error("Error:", error);
            toast({
                title: "Error",
                description: "Failed to load analytics data",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    // --- Chart Data Preparation ---
    const levelCounts = { Easy: 0, Medium: 0, Hard: 0 };

    // Process Question Stats for Pie Chart
    stats.forEach(s => {
        // Normalize level to Title Case (e.g., "easy" -> "Easy")
        const rawLevel = s.level || "Unknown";
        const level = (rawLevel.charAt(0).toUpperCase() + rawLevel.slice(1).toLowerCase()) as keyof typeof levelCounts;

        if (levelCounts[level] !== undefined) {
            levelCounts[level]++;
        }
    });

    const pieData = [
        { name: 'Easy', value: levelCounts.Easy },
        { name: 'Medium', value: levelCounts.Medium },
        { name: 'Hard', value: levelCounts.Hard },
    ].filter(d => d.value > 0);

    // Process Level Stats for Bar Chart
    const getLevelScore = (levelName: string) => {
        const stat = levelStats.find(l => l.level === levelName);
        return stat ? stat.average_score : 0;
    };

    const barData = [
        { name: 'Easy', score: getLevelScore('Easy') },
        { name: 'Medium', score: getLevelScore('Medium') },
        { name: 'Hard', score: getLevelScore('Hard') },
    ];

    const filteredStats = stats.filter(s =>
        s.question_text.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const renderTable = (levelFilter: string) => {
        const levelStats = filteredStats.filter(s => s.level.toLowerCase() === levelFilter.toLowerCase());

        return (
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Question</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {levelStats.map((stat) => (
                            <TableRow key={stat.question_id}>
                                <TableCell className="font-medium" title={stat.question_text}>
                                    {stat.question_text}
                                </TableCell>
                            </TableRow>
                        ))}
                        {levelStats.length === 0 && (
                            <TableRow>
                                <TableCell className="text-center py-8 text-muted-foreground">
                                    No questions found for this level.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        );
    };

    const handleExport = () => {
        // 1. Summary Data
        const summaryRows = [
            ['Level', 'Total Questions', 'Average Score (%)'],
            ['Easy', levelCounts.Easy, getLevelScore('Easy')],
            ['Medium', levelCounts.Medium, getLevelScore('Medium')],
            ['Hard', levelCounts.Hard, getLevelScore('Hard')],
        ];

        // 2. Detailed Data
        const detailRows = [
            ['Question', 'Level'],
            ...stats.map(s => {
                const rawLevel = s.level || "Unknown";
                const level = rawLevel.charAt(0).toUpperCase() + rawLevel.slice(1).toLowerCase();
                return [
                    `"${s.question_text.replace(/"/g, '""')}"`, // Escape quotes
                    level
                ];
            })
        ];

        // Combine
        const csvContent = [
            '--- Summary Statistics ---',
            ...summaryRows.map(e => e.join(',')),
            '',
            '--- Level Wise Questions ---',
            ...detailRows.map(e => e.join(','))
        ].join('\n');

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'question_analytics_report.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Question Analytics</h1>
                <Button variant="outline" onClick={handleExport} className="bg-emerald-500 text-white border-emerald-500 hover:bg-white hover:text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500 dark:border-emerald-500/20 dark:hover:bg-white dark:hover:text-emerald-500">
                    <Download className="mr-2 h-4 w-4" />
                    Export Report
                </Button>
            </div>

            {/* NEW: Performance Matrix Heatmap */}
            <SubjectDifficultyHeatmap />

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Total Questions</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                No data available
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Average Score by Level</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis domain={[0, 100]} />
                                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                                    <Bar dataKey="score" name="Avg Score %" radius={[4, 4, 0, 0]}>
                                        {barData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                No data available
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Tabbed Detailed View */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between mb-4">
                        <CardTitle>Level Wise Questions</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search questions..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="easy" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 mb-4">
                            <TabsTrigger
                                value="easy"
                                className="data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-500 data-[state=active]:border data-[state=active]:border-emerald-500/20 transition-all duration-300"
                            >
                                Easy Level
                            </TabsTrigger>
                            <TabsTrigger
                                value="medium"
                                className="data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-500 data-[state=active]:border data-[state=active]:border-emerald-500/20 transition-all duration-300"
                            >
                                Medium Level
                            </TabsTrigger>
                            <TabsTrigger
                                value="hard"
                                className="data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-500 data-[state=active]:border data-[state=active]:border-emerald-500/20 transition-all duration-300"
                            >
                                Hard Level
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="easy">
                            {renderTable('Easy')}
                        </TabsContent>
                        <TabsContent value="medium">
                            {renderTable('Medium')}
                        </TabsContent>
                        <TabsContent value="hard">
                            {renderTable('Hard')}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
};

export default QuestionAnalytics;
