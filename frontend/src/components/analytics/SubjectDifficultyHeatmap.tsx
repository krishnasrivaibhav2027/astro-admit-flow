import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import ReactECharts from 'echarts-for-react';
import { Grid3X3, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface HeatmapData {
    subject: string;
    level: string;
    attempts: number;
    pass_rate: number;
}

interface SubjectDifficultyHeatmapProps {
    institutionId?: string;
}

const SubjectDifficultyHeatmap = ({ institutionId }: SubjectDifficultyHeatmapProps) => {
    const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
    const [loading, setLoading] = useState(true);

    const subjects = ['Mathematics', 'Physics', 'Chemistry'];
    const levels = ['Easy', 'Medium', 'Hard'];

    useEffect(() => {
        fetchHeatmapData();
    }, [institutionId]);

    const fetchHeatmapData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const backendUrl = import.meta.env.VITE_BACKEND_URL;

            // Fetch results data to build heatmap
            let query = supabase
                .from('results')
                .select('subject, level, result');

            const { data: results, error } = await query;

            if (error) throw error;

            // Aggregate data by subject and level
            const aggregated: Record<string, { attempts: number; passed: number }> = {};

            (results || []).forEach((r: any) => {
                const subject = r.subject || 'General';
                const level = r.level || 'Medium';
                const key = `${subject}-${level}`;

                if (!aggregated[key]) {
                    aggregated[key] = { attempts: 0, passed: 0 };
                }
                aggregated[key].attempts++;
                if (r.result === 'pass') {
                    aggregated[key].passed++;
                }
            });

            // Convert to heatmap format
            const data: HeatmapData[] = [];
            subjects.forEach(subject => {
                levels.forEach(level => {
                    const key = `${subject}-${level}`;
                    const stats = aggregated[key] || { attempts: 0, passed: 0 };
                    const passRate = stats.attempts > 0
                        ? Math.round((stats.passed / stats.attempts) * 100)
                        : 0;

                    data.push({
                        subject,
                        level,
                        attempts: stats.attempts,
                        pass_rate: passRate
                    });
                });
            });

            setHeatmapData(data);
        } catch (error) {
            console.error("Error fetching heatmap data:", error);
        } finally {
            setLoading(false);
        }
    };

    const getOption = () => {
        // Prepare data for ECharts heatmap: [xIndex, yIndex, value]
        const chartData = heatmapData.map(d => [
            subjects.indexOf(d.subject),
            levels.indexOf(d.level),
            d.pass_rate
        ]);

        return {
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                borderColor: '#334155',
                textStyle: { color: '#fff' },
                formatter: (params: any) => {
                    const cell = heatmapData.find(
                        d => subjects.indexOf(d.subject) === params.value[0] &&
                            levels.indexOf(d.level) === params.value[1]
                    );
                    return `
                        <strong>${cell?.subject}</strong> - ${cell?.level}<br/>
                        Pass Rate: <strong>${cell?.pass_rate}%</strong><br/>
                        Attempts: ${cell?.attempts}
                    `;
                }
            },
            grid: {
                top: 30,
                bottom: 50,
                left: 100,
                right: 30
            },
            xAxis: {
                type: 'category',
                data: subjects,
                axisLine: { lineStyle: { color: '#334155' } },
                axisLabel: { color: '#94a3b8', fontSize: 12 },
                splitArea: { show: true }
            },
            yAxis: {
                type: 'category',
                data: levels,
                axisLine: { lineStyle: { color: '#334155' } },
                axisLabel: { color: '#94a3b8', fontSize: 12 },
                splitArea: { show: true }
            },
            visualMap: {
                min: 0,
                max: 100,
                calculable: true,
                orient: 'horizontal',
                left: 'center',
                bottom: 5,
                inRange: {
                    color: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981']
                },
                textStyle: { color: '#94a3b8' },
                formatter: (value: number) => `${value}%`
            },
            series: [{
                name: 'Pass Rate',
                type: 'heatmap',
                data: chartData,
                label: {
                    show: true,
                    color: '#fff',
                    fontWeight: 'bold',
                    formatter: (params: any) => `${params.value[2]}%`
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                },
                itemStyle: {
                    borderColor: '#1e293b',
                    borderWidth: 2
                }
            }]
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
                <CardTitle className="flex items-center gap-2 text-base">
                    <Grid3X3 className="h-5 w-5 text-purple-500" />
                    Subject × Difficulty Performance Matrix
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ReactECharts
                    option={getOption()}
                    style={{ height: '280px', width: '100%' }}
                    opts={{ renderer: 'svg' }}
                />
            </CardContent>
        </Card>
    );
};

export default SubjectDifficultyHeatmap;
