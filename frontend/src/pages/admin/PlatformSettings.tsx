import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Bell, Mail, Save, Shield, Sliders } from "lucide-react";
import { useState } from "react";

const PlatformSettings = () => {
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);

    // Settings state (would be fetched from API in production)
    const [settings, setSettings] = useState({
        platformName: "AstroAdmit",
        supportEmail: "support@astroadmit.com",
        autoApproveInstitutions: false,
        requireScorecard: true,
        emailNotifications: true,
        maintenanceMode: false,
        studentCooldownHours: 24,
        magicLinkExpiryDays: 7,
    });

    const handleSave = async () => {
        setSaving(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast({
            title: "Settings Saved",
            description: "Platform settings have been updated successfully.",
        });
        setSaving(false);
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
