import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { BarChart3, Building2, FileText, Loader2, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

interface PlatformMetrics {
    institutionsByType: { type: string; count: number }[];
    institutionsByState: { state: string; count: number }[];
    monthlyGrowth: { month: string; institutions: number; students: number }[];
}

const PlatformReports = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState<PlatformMetrics>({
        institutionsByType: [],
        institutionsByState: [],
        monthlyGrowth: []
    });

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/institutions/all`);
            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();

            // Calculate metrics from institutions data
            const typeCount: Record<string, number> = {};
            const stateCount: Record<string, number> = {};

            data.forEach((inst: any) => {
                typeCount[inst.type] = (typeCount[inst.type] || 0) + 1;
                if (inst.state) {
                    stateCount[inst.state] = (stateCount[inst.state] || 0) + 1;
                }
            });

            setMetrics({
                institutionsByType: Object.entries(typeCount).map(([type, count]) => ({ type, count })),
                institutionsByState: Object.entries(stateCount)
                    .map(([state, count]) => ({ state, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10),
                monthlyGrowth: [] // Would need historical data
            });
        } catch (error) {
            console.error('Error:', error);
            toast({
                title: "Error",
                description: "Failed to load reports",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
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
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-7 h-7 text-emerald-500" />
                    Platform Reports
                </h1>
                <p className="text-gray-600 dark:text-gray-400">Aggregated analytics across all institutions</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Institutions by Type */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-blue-500" />
                            Institutions by Type
                        </CardTitle>
                        <CardDescription>Distribution of registered institutions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {metrics.institutionsByType.length === 0 ? (
                            <p className="text-center text-gray-500 py-4">No data available</p>
                        ) : (
                            <div className="space-y-4">
                                {metrics.institutionsByType.map((item, index) => {
                                    const total = metrics.institutionsByType.reduce((acc, i) => acc + i.count, 0);
                                    const percentage = Math.round((item.count / total) * 100);
                                    return (
                                        <motion.div
                                            key={item.type}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                        >
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="capitalize font-medium">{item.type}</span>
                                                <span className="text-sm text-gray-500">{item.count} ({percentage}%)</span>
                                            </div>
                                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${percentage}%` }}
                                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
                                                />
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Institutions by State */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-purple-500" />
                            Top States
                        </CardTitle>
                        <CardDescription>Geographic distribution of institutions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {metrics.institutionsByState.length === 0 ? (
                            <p className="text-center text-gray-500 py-4">No data available</p>
                        ) : (
                            <div className="space-y-3">
                                {metrics.institutionsByState.map((item, index) => (
                                    <motion.div
                                        key={item.state}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="w-6 h-6 flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-sm font-medium">
                                                {index + 1}
                                            </span>
                                            <span className="font-medium">{item.state}</span>
                                        </div>
                                        <span className="text-gray-500">{item.count} institutions</span>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Summary Stats */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="w-5 h-5 text-emerald-500" />
                            Platform Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                                <p className="text-3xl font-bold text-emerald-600">
                                    {metrics.institutionsByType.reduce((acc, i) => acc + i.count, 0)}
                                </p>
                                <p className="text-sm text-gray-500">Total Institutions</p>
                            </div>
                            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <p className="text-3xl font-bold text-blue-600">
                                    {metrics.institutionsByType.length}
                                </p>
                                <p className="text-sm text-gray-500">Institution Types</p>
                            </div>
                            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                <p className="text-3xl font-bold text-purple-600">
                                    {metrics.institutionsByState.length}
                                </p>
                                <p className="text-sm text-gray-500">States Covered</p>
                            </div>
                            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                <p className="text-3xl font-bold text-yellow-600">
                                    {metrics.institutionsByState[0]?.state || '-'}
                                </p>
                                <p className="text-sm text-gray-500">Top State</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default PlatformReports;
