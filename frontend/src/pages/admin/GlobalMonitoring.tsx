import { Card, CardContent } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Building2, Calendar, GraduationCap, Loader2, MapPin, Users } from "lucide-react";
import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

interface Institution {
    id: string;
    name: string;
    type: string;
    status: string;
    address?: string;
    city?: string;
    state?: string;
    created_at: string;
    institution_admins: any[];
}

const GlobalMonitoring = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [institutions, setInstitutions] = useState<Institution[]>([]);

    useEffect(() => {
        fetchInstitutions();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchInstitutions, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchInstitutions = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/institutions/all`);
            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();

            // We want to show all approved institutions in monitoring usually
            // but let's just use the raw data which has everything needed based on prior knowledge
            const mappedData: Institution[] = data.map((inst: any) => ({
                id: inst.id,
                name: inst.name,
                type: inst.type,
                status: inst.status,
                address: inst.address || 'No address',
                city: inst.city || 'Unknown',
                state: inst.state || 'Unknown',
                created_at: inst.created_at,
                institution_admins: inst.institution_admins || []
            }));

            // Filter if strictly for "Monitoring Active" - typically approved ones
            const activeOnly = mappedData.filter(i => i.status === 'approved');
            setInstitutions(activeOnly.length > 0 ? activeOnly : mappedData); // Fallback to all if no approved to show something

        } catch (error) {
            console.error('Error:', error);
            toast({
                title: "Error",
                description: "Failed to load monitoring data",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
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
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Global Monitoring</h1>
                <p className="text-gray-600 dark:text-gray-400">Real-time status of all registered institutions</p>
            </div>

            {/* Institution Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {institutions.map((inst, index) => (
                    <motion.div
                        key={inst.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <HoverCard>
                            <HoverCardTrigger asChild>
                                <Card className="h-full cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-transparent hover:border-l-indigo-500">
                                    <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-3">
                                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2">
                                            <Building2 className="w-8 h-8 text-slate-600 dark:text-slate-400" />
                                        </div>
                                        <h3 className="font-semibold text-lg line-clamp-2">{inst.name}</h3>
                                        <span className={`text-xs px-2 py-1 rounded-full capitalize font-medium ${getStatusColor(inst.status)}`}>
                                            {inst.status}
                                        </span>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{inst.city}, {inst.state}</p>
                                    </CardContent>
                                </Card>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80 p-0 overflow-hidden">
                                <div className="bg-slate-50 dark:bg-slate-900 p-4 border-b">
                                    <h4 className="font-semibold flex items-center gap-2">
                                        <Building2 className="w-4 h-4" />
                                        {inst.name}
                                    </h4>
                                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {inst.address}
                                    </p>
                                </div>
                                <div className="p-4 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Users className="w-3 h-3" /> Admins
                                            </span>
                                            <p className="text-sm font-medium">{inst.institution_admins?.length || 0}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <GraduationCap className="w-3 h-3" /> Students
                                            </span>
                                            <p className="text-sm font-medium">--</p>
                                        </div>
                                    </div>

                                    <div className="space-y-1 pt-2 border-t">
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> Joined
                                        </span>
                                        <p className="text-sm">
                                            {new Date(inst.created_at).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </p>
                                    </div>

                                    {/* Mock Analytics Preview */}
                                    <div className="pt-2">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-muted-foreground">Activity Score</span>
                                            <span className="text-green-600 font-medium">Good</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-green-500 w-[75%] rounded-full" />
                                        </div>
                                    </div>
                                </div>
                            </HoverCardContent>
                        </HoverCard>
                    </motion.div>
                ))}
            </div>

            {loading && (
                <div className="flex justify-center py-12">
                    <p>Loading monitoring data...</p>
                </div>
            )}
        </div>
    );
};

export default GlobalMonitoring;
