import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import ReactECharts from 'echarts-for-react';
import { Filter, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface FunnelStage {
    stage: string;
    count: number;
    percentage: number;
}

interface RetentionFunnelProps {
    institutionId?: string;
}

const RetentionFunnel = ({ institutionId }: RetentionFunnelProps) => {
    const [funnelData, setFunnelData] = useState<FunnelStage[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFunnelData();
    }, [institutionId]);

    const fetchFunnelData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const backendUrl = import.meta.env.VITE_BACKEND_URL;

            const url = new URL(`${backendUrl}/api/super-admin/analytics/completion-funnel`);
            if (institutionId) url.searchParams.set('institution_id', institutionId);

            const response = await fetch(url.toString(), {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Failed to fetch funnel data");

            const data = await response.json();
            setFunnelData(data.funnel || []);
        } catch (error) {
            console.error("Error fetching funnel data:", error);
        } finally {
            setLoading(false);
        }
    };

    const getOption = () => {
        const stageColors = {
            'Enrolled': '#6366f1',      // Indigo
            'Started Test': '#8b5cf6',  // Purple  
            'Completed': '#10b981',     // Emerald
            'Passed': '#059669'         // Emerald darker
        };

        return {
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                borderColor: '#334155',
                textStyle: { color: '#fff' },
                formatter: (params: any) => {
                    const stage = funnelData.find(f => f.stage === params.name);
                    return `
                        <strong>${params.name}</strong><br/>
                        Count: ${stage?.count || 0}<br/>
                        Percentage: ${stage?.percentage || 0}%
                    `;
                }
            },
            legend: {
                show: false
            },
            series: [
                {
                    name: 'Completion Funnel',
                    type: 'funnel',
                    left: '10%',
                    top: 20,
                    bottom: 20,
                    width: '80%',
                    min: 0,
                    max: 100,
                    minSize: '20%',
                    maxSize: '100%',
                    sort: 'descending',
                    gap: 4,
                    label: {
                        show: true,
                        position: 'inside',
                        formatter: (params: any) => {
                            const stage = funnelData.find(f => f.stage === params.name);
                            return `${params.name}\n${stage?.count || 0} (${stage?.percentage || 0}%)`;
                        },
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 'bold'
                    },
                    labelLine: {
                        show: false
                    },
                    itemStyle: {
                        borderColor: 'transparent',
                        borderWidth: 0,
                        shadowBlur: 10,
                        shadowColor: 'rgba(0,0,0,0.3)'
                    },
                    emphasis: {
                        label: {
                            fontSize: 14
                        },
                        itemStyle: {
                            shadowBlur: 20,
                            shadowColor: 'rgba(0,0,0,0.5)'
                        }
                    },
                    data: funnelData.map(stage => ({
                        name: stage.stage,
                        value: stage.percentage,
                        itemStyle: {
                            color: stageColors[stage.stage as keyof typeof stageColors] || '#64748b'
                        }
                    }))
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

    // Calculate conversion rates
    const enrolledCount = funnelData.find(f => f.stage === 'Enrolled')?.count || 0;
    const passedCount = funnelData.find(f => f.stage === 'Passed')?.count || 0;
    const overallConversion = enrolledCount > 0 ? ((passedCount / enrolledCount) * 100).toFixed(1) : '0';

    return (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Filter className="h-5 w-5 text-purple-500" />
                        Student Completion Funnel
                    </CardTitle>
                    <div className="text-right">
                        <span className="text-lg font-bold text-emerald-500">{overallConversion}%</span>
                        <span className="text-xs text-muted-foreground block">Overall Conversion</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {funnelData.length > 0 ? (
                    <ReactECharts
                        option={getOption()}
                        style={{ height: '280px', width: '100%' }}
                        opts={{ renderer: 'svg' }}
                    />
                ) : (
                    <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                        No data available
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default RetentionFunnel;
