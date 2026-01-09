import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users } from "lucide-react";
import { useEffect, useState } from "react";

interface RetentionData {
    retention_7d: number;
    retention_14d: number;
    retention_30d: number;
    total_students: number;
    active_7d: number;
    active_14d: number;
    active_30d: number;
}

interface RetentionMetricsProps {
    institutionId?: string;
}

const RetentionMetrics = ({ institutionId }: RetentionMetricsProps) => {
    const [data, setData] = useState<RetentionData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRetentionData();
    }, [institutionId]);

    const fetchRetentionData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const backendUrl = import.meta.env.VITE_BACKEND_URL;

            const url = new URL(`${backendUrl}/api/super-admin/analytics/retention-rate`);
            if (institutionId) url.searchParams.set('institution_id', institutionId);

            const response = await fetch(url.toString(), {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Failed to fetch retention data");

            const responseData = await response.json();
            setData(responseData);
        } catch (error) {
            console.error("Error fetching retention data:", error);
        } finally {
            setLoading(false);
        }
    };

    const getRetentionColor = (rate: number) => {
        if (rate >= 70) return 'text-emerald-500';
        if (rate >= 40) return 'text-yellow-500';
        return 'text-red-500';
    };

    const getRetentionBgColor = (rate: number) => {
        if (rate >= 70) return 'bg-emerald-500/10 border-emerald-500/20';
        if (rate >= 40) return 'bg-yellow-500/10 border-yellow-500/20';
        return 'bg-red-500/10 border-red-500/20';
    };

    if (loading) {
        return (
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardContent className="flex items-center justify-center h-[180px]">
                    <Loader2 className="animate-spin h-6 w-6 text-emerald-500" />
                </CardContent>
            </Card>
        );
    }

    if (!data) {
        return (
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardContent className="flex items-center justify-center h-[180px] text-muted-foreground">
                    Unable to load retention data
                </CardContent>
            </Card>
        );
    }

    const metrics = [
        { label: '7-Day Retention', value: data.retention_7d, active: data.active_7d },
        { label: '14-Day Retention', value: data.retention_14d, active: data.active_14d },
        { label: '30-Day Retention', value: data.retention_30d, active: data.active_30d },
    ];

    return (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-5 w-5 text-blue-500" />
                    Student Retention
                    <span className="text-xs text-muted-foreground ml-auto">
                        {data.total_students} total students
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 gap-3">
                    {metrics.map((metric) => (
                        <div
                            key={metric.label}
                            className={`rounded-lg border p-3 text-center ${getRetentionBgColor(metric.value)}`}
                        >
                            <div className={`text-2xl font-bold ${getRetentionColor(metric.value)}`}>
                                {metric.value}%
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {metric.label}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {metric.active} active
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default RetentionMetrics;
