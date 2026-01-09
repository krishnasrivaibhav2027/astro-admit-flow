import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import ReactECharts from 'echarts-for-react';
import { ArrowDown, ArrowUp, Loader2, Minus, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

interface WeeklyScore {
    week: string;
    average_score: number;
    test_count: number;
    velocity: number;
}

interface LearningVelocityProps {
    institutionId?: string;
}

const LearningVelocityChart = ({ institutionId }: LearningVelocityProps) => {
    const [weeklyScores, setWeeklyScores] = useState<WeeklyScore[]>([]);
    const [trend, setTrend] = useState<string>('insufficient_data');
    const [totalTests, setTotalTests] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchVelocityData();
    }, [institutionId]);

    const fetchVelocityData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const backendUrl = import.meta.env.VITE_BACKEND_URL;

            const url = new URL(`${backendUrl}/api/super-admin/analytics/learning-velocity`);
            if (institutionId) url.searchParams.set('institution_id', institutionId);

            const response = await fetch(url.toString(), {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Failed to fetch velocity data");

            const data = await response.json();
            setWeeklyScores(data.weekly_scores || []);
            setTrend(data.overall_trend || 'insufficient_data');
            setTotalTests(data.total_tests_analyzed || 0);
        } catch (error) {
            console.error("Error fetching velocity data:", error);
        } finally {
            setLoading(false);
        }
    };

    const getTrendIcon = () => {
        switch (trend) {
            case 'improving': return <ArrowUp className="h-4 w-4 text-emerald-500" />;
            case 'declining': return <ArrowDown className="h-4 w-4 text-red-500" />;
            default: return <Minus className="h-4 w-4 text-slate-400" />;
        }
    };

    const getTrendBadge = () => {
        switch (trend) {
            case 'improving':
                return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Improving</Badge>;
            case 'declining':
                return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Declining</Badge>;
            case 'stable':
                return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Stable</Badge>;
            default:
                return <Badge variant="outline">Insufficient Data</Badge>;
        }
    };

    const getOption = () => {
        const weeks = weeklyScores.map(w => w.week.replace(/^\d{4}-W/, 'W'));
        const scores = weeklyScores.map(w => w.average_score);
        const velocities = weeklyScores.map(w => w.velocity);

        return {
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'cross' },
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                borderColor: '#334155',
                textStyle: { color: '#fff' },
                formatter: (params: any) => {
                    const weekData = weeklyScores[params[0].dataIndex];
                    return `
                        <strong>${weekData.week}</strong><br/>
                        Average Score: <strong>${weekData.average_score}%</strong><br/>
                        Tests Taken: ${weekData.test_count}<br/>
                        Velocity: <span style="color: ${weekData.velocity >= 0 ? '#10b981' : '#ef4444'}">${weekData.velocity >= 0 ? '+' : ''}${weekData.velocity}</span>
                    `;
                }
            },
            legend: {
                data: ['Average Score', 'Velocity'],
                textStyle: { color: '#94a3b8' },
                bottom: 0
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: weeks,
                axisLine: { lineStyle: { color: '#334155' } },
                axisLabel: { color: '#94a3b8' }
            },
            yAxis: [
                {
                    type: 'value',
                    name: 'Score %',
                    min: 0,
                    max: 100,
                    axisLine: { lineStyle: { color: '#334155' } },
                    axisLabel: { color: '#94a3b8', formatter: '{value}%' },
                    splitLine: { lineStyle: { color: '#1e293b' } }
                },
                {
                    type: 'value',
                    name: 'Velocity',
                    axisLine: { lineStyle: { color: '#334155' } },
                    axisLabel: { color: '#94a3b8' },
                    splitLine: { show: false }
                }
            ],
            series: [
                {
                    name: 'Average Score',
                    type: 'line',
                    smooth: true,
                    areaStyle: {
                        color: {
                            type: 'linear',
                            x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [
                                { offset: 0, color: 'rgba(16, 185, 129, 0.4)' },
                                { offset: 1, color: 'rgba(16, 185, 129, 0.05)' }
                            ]
                        }
                    },
                    lineStyle: { color: '#10b981', width: 3 },
                    itemStyle: { color: '#10b981' },
                    data: scores
                },
                {
                    name: 'Velocity',
                    type: 'bar',
                    yAxisIndex: 1,
                    itemStyle: {
                        color: (params: any) => {
                            return velocities[params.dataIndex] >= 0 ? '#10b981' : '#ef4444';
                        }
                    },
                    data: velocities
                }
            ]
        };
    };

    if (loading) {
        return (
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardContent className="flex items-center justify-center h-[300px]">
                    <Loader2 className="animate-spin h-6 w-6 text-emerald-500" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <TrendingUp className="h-5 w-5 text-emerald-500" />
                        Learning Velocity
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        {getTrendIcon()}
                        {getTrendBadge()}
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">
                    Score improvement rate over time • {totalTests} tests analyzed
                </p>
            </CardHeader>
            <CardContent>
                {weeklyScores.length > 0 ? (
                    <ReactECharts
                        option={getOption()}
                        style={{ height: '280px', width: '100%' }}
                        opts={{ renderer: 'svg' }}
                    />
                ) : (
                    <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                        No data available for the selected period
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default LearningVelocityChart;
