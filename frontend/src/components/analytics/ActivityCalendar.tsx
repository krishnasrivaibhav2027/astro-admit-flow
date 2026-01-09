import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import ReactECharts from 'echarts-for-react';
import { CalendarDays, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface CalendarData {
    date: string;
    count: number;
}

interface ActivityCalendarProps {
    institutionId?: string;
    days?: number;
}

const ActivityCalendar = ({ institutionId, days = 90 }: ActivityCalendarProps) => {
    const [calendarData, setCalendarData] = useState<CalendarData[]>([]);
    const [maxCount, setMaxCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCalendarData();
    }, [institutionId, days]);

    const fetchCalendarData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const backendUrl = import.meta.env.VITE_BACKEND_URL;

            const url = new URL(`${backendUrl}/api/super-admin/analytics/activity-calendar`);
            if (institutionId) url.searchParams.set('institution_id', institutionId);
            url.searchParams.set('days', days.toString());

            const response = await fetch(url.toString(), {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Failed to fetch calendar data");

            const data = await response.json();
            setCalendarData(data.calendar || []);
            setMaxCount(data.max_count || 0);
        } catch (error) {
            console.error("Error fetching calendar data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Transform data for ECharts calendar heatmap
    const getOption = () => {
        // Get date range
        const sortedDates = calendarData.map(d => d.date).sort();
        const startDate = sortedDates[0] || new Date().toISOString().split('T')[0];
        const endDate = sortedDates[sortedDates.length - 1] || new Date().toISOString().split('T')[0];

        // Transform to [date, value] format
        const heatmapData = calendarData.map(d => [d.date, d.count]);

        return {
            tooltip: {
                trigger: 'item',
                formatter: (params: any) => {
                    return `${params.value[0]}<br/>Tests: <strong>${params.value[1]}</strong>`;
                }
            },
            visualMap: {
                min: 0,
                max: Math.max(maxCount, 1),
                calculable: true,
                orient: 'horizontal',
                left: 'center',
                bottom: 20,
                inRange: {
                    color: ['#1e293b', '#065f46', '#059669', '#34d399', '#6ee7b7']
                },
                textStyle: {
                    color: '#94a3b8'
                }
            },
            calendar: {
                top: 60,
                left: 50,
                right: 30,
                cellSize: ['auto', 15],
                range: [startDate, endDate],
                itemStyle: {
                    borderWidth: 2,
                    borderColor: '#1e293b'
                },
                yearLabel: { show: false },
                dayLabel: {
                    color: '#94a3b8',
                    fontSize: 11,
                    nameMap: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                monthLabel: {
                    color: '#94a3b8',
                    fontSize: 12
                },
                splitLine: {
                    show: true,
                    lineStyle: {
                        color: '#334155',
                        width: 1
                    }
                }
            },
            series: [{
                type: 'heatmap',
                coordinateSystem: 'calendar',
                data: heatmapData,
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        };
    };

    if (loading) {
        return (
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardContent className="flex items-center justify-center h-[200px]">
                    <Loader2 className="animate-spin h-6 w-6 text-emerald-500" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarDays className="h-5 w-5 text-emerald-500" />
                    Activity Calendar
                    <span className="text-xs text-muted-foreground ml-2">
                        ({days} days)
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ReactECharts
                    option={getOption()}
                    style={{ height: '180px', width: '100%' }}
                    opts={{ renderer: 'svg' }}
                />
            </CardContent>
        </Card>
    );
};

export default ActivityCalendar;
