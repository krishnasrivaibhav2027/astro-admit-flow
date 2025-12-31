import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, Check, Clock, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

interface Institution {
    id: string;
    name: string;
    type: string;
    website: string | null;
    affiliation_number: string | null;
    state: string | null;
    status: 'pending' | 'approved' | 'rejected' | 'suspended';
    rejection_reason: string | null;
    created_at: string;
    approved_at: string | null;
    institution_admins: Array<{
        id: string;
        email: string;
        name: string;
        phone: string | null;
        designation: string | null;
        status: string;
    }>;
}

type FilterTab = 'pending' | 'approved' | 'rejected' | 'all';

const SuperAdminDashboard = () => {
    const { toast } = useToast();
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<FilterTab>('pending');
    const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [userEmail, setUserEmail] = useState('');

    useEffect(() => {
        fetchUserEmail();
        fetchInstitutions();
    }, []);

    const fetchUserEmail = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
            setUserEmail(session.user.email);
        }
    };

    const fetchInstitutions = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/api/institutions/all`);
            if (!response.ok) throw new Error('Failed to fetch institutions');
            const data = await response.json();
            setInstitutions(data);
        } catch (error) {
            console.error('Error:', error);
            toast({
                title: "Error",
                description: "Failed to load institutions",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (institution: Institution) => {
        try {
            setActionLoading(institution.id);
            const response = await fetch(`${API_BASE}/api/institutions/approve/${institution.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ approved_by_email: userEmail })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to approve');
            }

            toast({
                title: "Institution Approved",
                description: `${institution.name} has been approved successfully.`,
            });
            fetchInstitutions();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async () => {
        if (!selectedInstitution || !rejectionReason.trim()) return;

        try {
            setActionLoading(selectedInstitution.id);
            const response = await fetch(`${API_BASE}/api/institutions/reject/${selectedInstitution.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rejected_by_email: userEmail,
                    reason: rejectionReason
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to reject');
            }

            toast({
                title: "Institution Rejected",
                description: `${selectedInstitution.name} has been rejected.`,
            });
            setShowRejectModal(false);
            setRejectionReason('');
            setSelectedInstitution(null);
            fetchInstitutions();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setActionLoading(null);
        }
    };

    const filteredInstitutions = institutions.filter(inst => {
        if (activeTab === 'all') return true;
        return inst.status === activeTab;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
            case 'approved':
                return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"><Check className="w-3 h-3 mr-1" /> Approved</Badge>;
            case 'rejected':
                return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"><X className="w-3 h-3 mr-1" /> Rejected</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    const tabs: { key: FilterTab; label: string; count: number }[] = [
        { key: 'pending', label: 'Pending Review', count: institutions.filter(i => i.status === 'pending').length },
        { key: 'approved', label: 'Approved', count: institutions.filter(i => i.status === 'approved').length },
        { key: 'rejected', label: 'Rejected', count: institutions.filter(i => i.status === 'rejected').length },
        { key: 'all', label: 'All', count: institutions.length },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Institution Management</h1>
                    <p className="text-gray-600 dark:text-gray-400">Review and manage organization registrations</p>
                </div>
                <Button onClick={fetchInstitutions} variant="outline" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200 dark:border-slate-700 pb-2">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800'
                            }`}
                    >
                        {tab.label} ({tab.count})
                    </button>
                ))}
            </div>

            {/* Institution Cards */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                </div>
            ) : filteredInstitutions.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">No institutions found</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    <AnimatePresence>
                        {filteredInstitutions.map((inst, index) => (
                            <motion.div
                                key={inst.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card className="hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Building2 className="w-5 h-5 text-emerald-500" />
                                                    {inst.name}
                                                </CardTitle>
                                                <CardDescription className="mt-1">
                                                    {inst.type} • {inst.state || 'N/A'} • Submitted {new Date(inst.created_at).toLocaleDateString()}
                                                </CardDescription>
                                            </div>
                                            {getStatusBadge(inst.status)}
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="space-y-2 text-sm">
                                                <p><span className="font-medium">Website:</span> {inst.website || 'N/A'}</p>
                                                <p><span className="font-medium">Affiliation #:</span> {inst.affiliation_number || 'N/A'}</p>
                                            </div>

                                            {inst.institution_admins?.[0] && (
                                                <div className="space-y-2 text-sm bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
                                                    <p className="font-medium text-gray-700 dark:text-gray-300">Admin Contact:</p>
                                                    <p>{inst.institution_admins[0].name}</p>
                                                    <p className="text-gray-600 dark:text-gray-400">{inst.institution_admins[0].email}</p>
                                                    <p className="text-gray-600 dark:text-gray-400">{inst.institution_admins[0].phone || 'No phone'}</p>
                                                    <p className="text-gray-600 dark:text-gray-400 text-xs">{inst.institution_admins[0].designation}</p>
                                                </div>
                                            )}
                                        </div>

                                        {inst.status === 'rejected' && inst.rejection_reason && (
                                            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                                <p className="text-sm text-red-700 dark:text-red-400">
                                                    <span className="font-medium">Rejection Reason:</span> {inst.rejection_reason}
                                                </p>
                                            </div>
                                        )}

                                        {inst.status === 'pending' && (
                                            <div className="mt-4 flex gap-2 justify-end">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedInstitution(inst);
                                                        setShowRejectModal(true);
                                                    }}
                                                    disabled={actionLoading === inst.id}
                                                    className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                >
                                                    <X className="w-4 h-4 mr-1" /> Reject
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleApprove(inst)}
                                                    disabled={actionLoading === inst.id}
                                                    className="bg-emerald-600 hover:bg-emerald-700"
                                                >
                                                    {actionLoading === inst.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                                    ) : (
                                                        <Check className="w-4 h-4 mr-1" />
                                                    )}
                                                    Approve
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Rejection Modal */}
            {showRejectModal && selectedInstitution && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl"
                    >
                        <h3 className="text-lg font-semibold mb-2">Reject Institution</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                            Rejecting <strong>{selectedInstitution.name}</strong>. Please provide a reason.
                        </p>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Enter rejection reason..."
                            className="w-full p-3 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white resize-none h-24"
                        />
                        <div className="flex gap-2 mt-4 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setRejectionReason('');
                                    setSelectedInstitution(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleReject}
                                disabled={!rejectionReason.trim() || actionLoading === selectedInstitution.id}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                {actionLoading === selectedInstitution.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                ) : null}
                                Confirm Rejection
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminDashboard;
