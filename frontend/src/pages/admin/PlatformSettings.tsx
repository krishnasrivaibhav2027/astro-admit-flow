import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Bell, CheckCircle, Clock, Loader2, Mail, Save, Send, Shield, Sliders, UserPlus, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface Invitation {
    id: string;
    email: string;
    name: string;
    status: 'pending' | 'accepted' | 'expired' | 'revoked';
    created_at: string;
    accepted_at?: string;
}

const PlatformSettings = () => {
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);
    const [currentUserEmail, setCurrentUserEmail] = useState<string>("");

    // Invitation state
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteName, setInviteName] = useState("");
    const [inviting, setInviting] = useState(false);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [loadingInvitations, setLoadingInvitations] = useState(true);

    // Settings state
    const [settings, setSettings] = useState({
        platformName: "AdmitFlow",
        supportEmail: "versatilevaibhu@gmail.com",
        autoApproveInstitutions: false,
        requireScorecard: true,
        emailNotifications: true,
        maintenanceMode: false,
        studentCooldownHours: 24,
        magicLinkExpiryDays: 7,
    });

    // Get current user email
    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) {
                setCurrentUserEmail(user.email);
            }
        };
        getUser();
    }, []);

    // Fetch invitations on load
    useEffect(() => {
        if (currentUserEmail) {
            fetchInvitations();
        }
    }, [currentUserEmail]);

    const fetchInvitations = async () => {
        setLoadingInvitations(true);
        try {
            const response = await fetch(
                `${API_URL}/api/institutions/super-admin/invitations?requesting_email=${encodeURIComponent(currentUserEmail)}`
            );
            if (response.ok) {
                const data = await response.json();
                setInvitations(data);
            }
        } catch (error) {
            console.error("Failed to fetch invitations:", error);
        } finally {
            setLoadingInvitations(false);
        }
    };

    const handleInvite = async () => {
        if (!inviteEmail || !inviteName) {
            toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
            return;
        }

        setInviting(true);
        try {
            const response = await fetch(`${API_URL}/api/institutions/super-admin/invite`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: inviteEmail,
                    name: inviteName,
                    invited_by_email: currentUserEmail
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                toast({ title: "Invitation Sent!", description: `Invitation sent to ${inviteEmail}` });
                setInviteEmail("");
                setInviteName("");
                fetchInvitations();
            } else {
                toast({ title: "Error", description: data.detail || "Failed to send invitation", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to send invitation", variant: "destructive" });
        } finally {
            setInviting(false);
        }
    };

    const handleRevoke = async (invitationId: string) => {
        try {
            const response = await fetch(
                `${API_URL}/api/institutions/super-admin/revoke/${invitationId}?requesting_email=${encodeURIComponent(currentUserEmail)}`,
                { method: "DELETE" }
            );

            if (response.ok) {
                toast({ title: "Revoked", description: "Invitation has been revoked" });
                fetchInvitations();
            } else {
                const data = await response.json();
                toast({ title: "Error", description: data.detail || "Failed to revoke", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to revoke invitation", variant: "destructive" });
        }
    };

    const handleSave = async () => {
        setSaving(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast({
            title: "Settings Saved",
            description: "Platform settings have been updated successfully.",
        });
        setSaving(false);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                    <Clock className="w-3 h-3" /> Pending
                </span>;
            case 'accepted':
                return <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle className="w-3 h-3" /> Activated
                </span>;
            case 'revoked':
                return <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                    <XCircle className="w-3 h-3" /> Revoked
                </span>;
            default:
                return <span className="text-gray-500">{status}</span>;
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Sliders className="w-7 h-7 text-emerald-500" />
                    Platform Settings
                </h1>
                <p className="text-gray-600 dark:text-gray-400">Configure global platform settings and preferences</p>
            </div>

            <div className="grid gap-6">
                {/* Super Admin Invitations */}
                <Card className="border-purple-200 dark:border-purple-800">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-purple-500" />
                            Super Admin Management
                        </CardTitle>
                        <CardDescription>Invite new super admins to the platform</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Invite Form */}
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg space-y-4">
                            <h3 className="font-medium text-purple-900 dark:text-purple-100">Invite New Super Admin</h3>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="inviteName">Full Name</Label>
                                    <Input
                                        id="inviteName"
                                        placeholder="John Doe"
                                        value={inviteName}
                                        onChange={(e) => setInviteName(e.target.value)}
                                        className="bg-white dark:bg-slate-800"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="inviteEmail">Email Address</Label>
                                    <Input
                                        id="inviteEmail"
                                        type="email"
                                        placeholder="admin@company.com"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        className="bg-white dark:bg-slate-800"
                                    />
                                </div>
                            </div>
                            <Button
                                onClick={handleInvite}
                                disabled={inviting || !inviteEmail || !inviteName}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                {inviting ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                                ) : (
                                    <><Send className="w-4 h-4 mr-2" /> Send Invitation</>
                                )}
                            </Button>
                        </div>

                        {/* Invitations List */}
                        <div className="space-y-3">
                            <h3 className="font-medium text-gray-900 dark:text-gray-100">Invitation History</h3>
                            {loadingInvitations ? (
                                <div className="text-center py-4 text-gray-500">
                                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                                    Loading invitations...
                                </div>
                            ) : invitations.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-4">No invitations sent yet</p>
                            ) : (
                                <div className="border rounded-lg overflow-hidden dark:border-slate-700">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 dark:bg-slate-800">
                                            <tr>
                                                <th className="text-left px-4 py-3 font-medium">Name</th>
                                                <th className="text-left px-4 py-3 font-medium">Email</th>
                                                <th className="text-left px-4 py-3 font-medium">Status</th>
                                                <th className="text-left px-4 py-3 font-medium">Date</th>
                                                <th className="text-right px-4 py-3 font-medium">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y dark:divide-slate-700">
                                            {invitations.map((inv) => (
                                                <tr key={inv.id} className="bg-white dark:bg-slate-900">
                                                    <td className="px-4 py-3 font-medium">{inv.name}</td>
                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{inv.email}</td>
                                                    <td className="px-4 py-3">{getStatusBadge(inv.status)}</td>
                                                    <td className="px-4 py-3 text-gray-500">
                                                        {new Date(inv.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {inv.status === 'pending' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleRevoke(inv.id)}
                                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            >
                                                                <X className="w-4 h-4 mr-1" /> Revoke
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* General Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Shield className="w-5 h-5 text-emerald-500" />
                            General Settings
                        </CardTitle>
                        <CardDescription>Basic platform configuration</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="platformName">Platform Name</Label>
                            <Input
                                id="platformName"
                                value={settings.platformName}
                                onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="supportEmail">Support Email</Label>
                            <Input
                                id="supportEmail"
                                type="email"
                                value={settings.supportEmail}
                                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Maintenance Mode</p>
                                <p className="text-sm text-gray-500">Temporarily disable platform access</p>
                            </div>
                            <Switch
                                checked={settings.maintenanceMode}
                                onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Institution Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Shield className="w-5 h-5 text-blue-500" />
                            Institution Settings
                        </CardTitle>
                        <CardDescription>Configure institution registration rules</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Auto-Approve Institutions</p>
                                <p className="text-sm text-gray-500">Automatically approve new registrations</p>
                            </div>
                            <Switch
                                checked={settings.autoApproveInstitutions}
                                onCheckedChange={(checked) => setSettings({ ...settings, autoApproveInstitutions: checked })}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Require Scorecard Upload</p>
                                <p className="text-sm text-gray-500">Students must upload scorecard for access</p>
                            </div>
                            <Switch
                                checked={settings.requireScorecard}
                                onCheckedChange={(checked) => setSettings({ ...settings, requireScorecard: checked })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="cooldown">Student Rejection Cooldown (hours)</Label>
                            <Input
                                id="cooldown"
                                type="number"
                                value={settings.studentCooldownHours}
                                onChange={(e) => setSettings({ ...settings, studentCooldownHours: parseInt(e.target.value) })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="magicExpiry">Magic Link Expiry (days)</Label>
                            <Input
                                id="magicExpiry"
                                type="number"
                                value={settings.magicLinkExpiryDays}
                                onChange={(e) => setSettings({ ...settings, magicLinkExpiryDays: parseInt(e.target.value) })}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Notification Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Bell className="w-5 h-5 text-purple-500" />
                            Notifications
                        </CardTitle>
                        <CardDescription>Configure email and notification settings</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Email Notifications</p>
                                <p className="text-sm text-gray-500">Send emails for approvals and rejections</p>
                            </div>
                            <Switch
                                checked={settings.emailNotifications}
                                onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
                            />
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <Mail className="w-5 h-5 text-blue-500" />
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                Email templates can be customized in Supabase Auth settings
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                    {saving ? "Saving..." : (
                        <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Settings
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
};

export default PlatformSettings;

