import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Clock, ExternalLink, FileText, Loader2, User, X } from "lucide-react";
import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

interface StudentRequest {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    stream_applied: string | null;
    scorecard_url: string;
    status: 'pending' | 'approved' | 'rejected';
    rejection_reason: string | null;
    created_at: string;
    reviewed_at: string | null;
    institution_id: string;
}

interface AdminInfo {
    institution_id: string;
    institution_name: string;
}

type FilterTab = 'pending' | 'approved' | 'rejected' | 'all';

const StudentReviewDashboard = () => {
    const { toast } = useToast();
    const [requests, setRequests] = useState<StudentRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<FilterTab>('pending');
    const [selectedRequest, setSelectedRequest] = useState<StudentRequest | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);

    useEffect(() => {
        initializeDashboard();
    }, []);

    const initializeDashboard = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
            setUserEmail(session.user.email);
            await fetchAdminInfo(session.user.email);
        }
    };

    const fetchAdminInfo = async (email: string) => {
        try {
            const response = await fetch(`${API_BASE}/api/institutions/check-admin-type?email=${encodeURIComponent(email)}`);
            if (!response.ok) throw new Error('Failed to get admin info');
            const data = await response.json();

            // PRIORITY 1: Always check localStorage context first (set during login)
            const contextId = localStorage.getItem('admin_institution_context');

            if (contextId) {
                // Use the institution selected at login time
                console.log('Using institution context from login:', contextId);

                // Fetch institution name for display
                try {
                    const instResponse = await fetch(`${API_BASE}/api/institutions`);
                    if (instResponse.ok) {
                        const institutions = await instResponse.json();
                        const inst = institutions.find((i: any) => i.id === contextId);
                        if (inst) {
                            setAdminInfo({
                                institution_id: contextId,
                                institution_name: inst.name
                            });
                        }
                    }
                } catch (e) {
                    console.warn('Could not fetch institution name');
                }

                await fetchRequests(contextId);
            } else if (data.institution_id) {
                // PRIORITY 2: Use API-returned institution_id (single-institution admin)
                setAdminInfo({
                    institution_id: data.institution_id,
                    institution_name: data.institution_name
                });
                await fetchRequests(data.institution_id);
            } else if (['super_admin', 'legacy_admin', 'institution_admin', 'admin'].includes(data.admin_type)) {
                // PRIORITY 3: Super admin without context - show all
                await fetchAllRequests();
            } else {
                // Not an admin or unknown type
                console.warn('User is not a recognized admin:', data);
                toast({
                    title: "Access Denied",
                    description: "You do not have permission to view this dashboard.",
                    variant: "destructive"
                });
                setLoading(false);
            }
        } catch (error) {
            console.error('Error:', error);
            toast({
                title: "Error",
                description: "Failed to load admin information",
                variant: "destructive"
            });
            setLoading(false);
        }
    };

    const fetchRequests = async (institutionId: string) => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/api/institutions/student-requests/${institutionId}`);
            if (!response.ok) throw new Error('Failed to fetch requests');
            const data = await response.json();
            setRequests(data);
        } catch (error) {
            console.error('Error:', error);
            toast({
                title: "Error",
                description: "Failed to load student requests",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchAllRequests = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            const email = session?.user?.email;

            if (!email) return;

            const response = await fetch(`${API_BASE}/api/institutions/all-student-requests?user_email=${encodeURIComponent(email)}`);
            if (!response.ok) throw new Error('Failed to fetch requests');

            const data = await response.json();
            setRequests(data);
        } catch (error) {
            console.error('Error:', error);
            toast({
                title: "Error",
                description: "Failed to load all student requests",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (request: StudentRequest) => {
        try {
            setActionLoading(request.id);
            const response = await fetch(`${API_BASE}/api/institutions/student-access/approve/${request.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ approved_by_email: userEmail })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to approve');
            }

            const result = await response.json();

            toast({
                title: "Student Approved",
                description: `${request.name} has been approved! Magic link generated.`,
            });

            // Log magic link for testing
            if (result.magic_link) {
                console.log("Magic Link:", result.magic_link);
            }

            // Refresh the requests list
            const contextId = localStorage.getItem('admin_institution_context');
            if (contextId) {
                fetchRequests(contextId);
            } else if (adminInfo?.institution_id) {
                fetchRequests(adminInfo.institution_id);
            } else {
                fetchAllRequests();
            }
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
        if (!selectedRequest || !rejectionReason.trim()) return;

        try {
            setActionLoading(selectedRequest.id);
            const response = await fetch(`${API_BASE}/api/institutions/student-access/reject/${selectedRequest.id}`, {
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
                title: "Request Rejected",
                description: `${selectedRequest.name}'s request has been rejected.`,
            });
            setShowRejectModal(false);
            setRejectionReason('');
            setSelectedRequest(null);

            if (adminInfo?.institution_id) {
                fetchRequests(adminInfo.institution_id);
            }
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

    const filteredRequests = requests.filter(req => {
        if (activeTab === 'all') return true;
        return req.status === activeTab;
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
        { key: 'pending', label: 'Pending Review', count: requests.filter(r => r.status === 'pending').length },
        { key: 'approved', label: 'Approved', count: requests.filter(r => r.status === 'approved').length },
        { key: 'rejected', label: 'Rejected', count: requests.filter(r => r.status === 'rejected').length },
        { key: 'all', label: 'All', count: requests.length },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student Access Requests</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        {adminInfo?.institution_name
                            ? `Review student applications for ${adminInfo.institution_name}`
                            : 'Review and approve student access requests'
                        }
                    </p>
                </div>
                <Button
                    onClick={() => adminInfo?.institution_id && fetchRequests(adminInfo.institution_id)}
                    variant="outline"
                    disabled={loading}
                >
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

            {/* Request Cards */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                </div>
            ) : filteredRequests.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <User className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">No student requests found</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    <AnimatePresence>
                        {filteredRequests.map((req, index) => (
                            <motion.div
                                key={req.id}
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
                                                    <User className="w-5 h-5 text-emerald-500" />
                                                    {req.name}
                                                </CardTitle>
                                                <CardDescription className="mt-1">
                                                    {req.email} • Applied {new Date(req.created_at).toLocaleDateString()}
                                                </CardDescription>
                                            </div>
                                            {getStatusBadge(req.status)}
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="space-y-2 text-sm">
                                                <p><span className="font-medium">Phone:</span> {req.phone || 'N/A'}</p>
                                                <p><span className="font-medium">Stream:</span> {req.stream_applied || 'Not specified'}</p>
                                            </div>

                                            <div className="flex items-center">
                                                {req.scorecard_url && req.scorecard_url.startsWith('http') ? (
                                                    <a
                                                        href={req.scorecard_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                        View Scorecard
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                ) : (
                                                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded-lg cursor-not-allowed">
                                                        <FileText className="w-4 h-4" />
                                                        No Scorecard
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {req.status === 'rejected' && req.rejection_reason && (
                                            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                                <p className="text-sm text-red-700 dark:text-red-400">
                                                    <span className="font-medium">Rejection Reason:</span> {req.rejection_reason}
                                                </p>
                                            </div>
                                        )}

                                        {req.status === 'pending' && (
                                            <div className="mt-4 flex gap-2 justify-end">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedRequest(req);
                                                        setShowRejectModal(true);
                                                    }}
                                                    disabled={actionLoading === req.id}
                                                    className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                >
                                                    <X className="w-4 h-4 mr-1" /> Reject
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleApprove(req)}
                                                    disabled={actionLoading === req.id}
                                                    className="bg-emerald-600 hover:bg-emerald-700"
                                                >
                                                    {actionLoading === req.id ? (
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
            {showRejectModal && selectedRequest && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl"
                    >
                        <h3 className="text-lg font-semibold mb-2">Reject Application</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                            Rejecting <strong>{selectedRequest.name}</strong>'s application. They can re-apply after 24 hours.
                        </p>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Enter rejection reason (e.g., invalid scorecard, incomplete information)..."
                            className="w-full p-3 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white resize-none h-24"
                        />
                        <div className="flex gap-2 mt-4 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setRejectionReason('');
                                    setSelectedRequest(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleReject}
                                disabled={!rejectionReason.trim() || actionLoading === selectedRequest.id}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                {actionLoading === selectedRequest.id ? (
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

export default StudentReviewDashboard;
