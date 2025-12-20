import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Bot, Database, GraduationCap, Save, Settings as SettingsIcon, Zap } from "lucide-react";
import { useEffect, useState } from "react";

const Settings = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [settings, setSettings] = useState({
        model: "gemini-2.5-flash-lite",
        temperature: 0.7,
        email_notifications: true,
        passing_score: 70,
        max_attempts: 3,
        rag_k: 3
    });

    const models = [
        { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
        { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite" },
        { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro (High Reasoning)" },
        { id: "Qwen/Qwen2.5-0.5B-Instruct", name: "Qwen 2.5 0.5B (Local Microservice)" },
    ];

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const response = await fetch(`${backendUrl}/api/admin/settings`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                // Merge with defaults to ensure all fields exist
                setSettings(prev => ({ ...prev, ...data }));
            }
        } catch (error) {
            console.error("Failed to fetch settings:", error);
            toast({
                title: "Error",
                description: "Failed to load settings",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const response = await fetch(`${backendUrl}/api/admin/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(settings)
            });

            if (response.ok) {
                toast({
                    title: "Settings Saved",
                    description: "System configuration has been updated successfully.",
                    className: "bg-emerald-500 text-white border-none"
                });
            } else {
                throw new Error("Failed to save");
            }
        } catch (error) {
            console.error("Failed to save settings:", error);
            toast({
                title: "Error",
                description: "Failed to save settings",
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <SettingsIcon className="w-8 h-8 text-emerald-600" />
                        System Settings
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-2">
                        Configure global application parameters and AI behavior
                    </p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                >
                    <Save className="w-4 h-4" />
                    {saving ? "Saving..." : "Save Changes"}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* AI Configuration */}
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bot className="w-5 h-5 text-emerald-600" />
                            AI Configuration
                        </CardTitle>
                        <CardDescription>
                            Manage the underlying AI models for question generation and evaluation
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Active Model</Label>
                            <Select
                                value={settings.model}
                                onValueChange={(value) => setSettings({ ...settings, model: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select AI Model" />
                                </SelectTrigger>
                                <SelectContent>
                                    {models.map(model => (
                                        <SelectItem key={model.id} value={model.id}>
                                            {model.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                This model will be used for all new test generations and evaluations.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label>Temperature (Creativity): {settings.temperature}</Label>
                            </div>
                            <Slider
                                value={[settings.temperature]}
                                min={0}
                                max={1}
                                step={0.1}
                                onValueChange={(value) => setSettings({ ...settings, temperature: value[0] })}
                                className="py-4"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Precise (0.0)</span>
                                <span>Balanced (0.5)</span>
                                <span>Creative (1.0)</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Test Configuration */}
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <GraduationCap className="w-5 h-5 text-emerald-600" />
                            Test Configuration
                        </CardTitle>
                        <CardDescription>
                            Set passing criteria and attempt limits
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label>Passing Score: {settings.passing_score}%</Label>
                            </div>
                            <Slider
                                value={[settings.passing_score]}
                                min={50}
                                max={100}
                                step={5}
                                onValueChange={(value) => setSettings({ ...settings, passing_score: value[0] })}
                                className="py-4"
                            />
                            <p className="text-xs text-muted-foreground">
                                Minimum score required to pass a level.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>Max Attempts per Level</Label>
                            <Input
                                type="number"
                                min={1}
                                max={10}
                                value={settings.max_attempts}
                                onChange={(e) => setSettings({ ...settings, max_attempts: parseInt(e.target.value) || 1 })}
                                className="max-w-[100px]"
                            />
                            <p className="text-xs text-muted-foreground">
                                Number of times a student can attempt a level before being locked out.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* RAG Configuration */}
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="w-5 h-5 text-emerald-600" />
                            RAG Configuration
                        </CardTitle>
                        <CardDescription>
                            Configure Retrieval-Augmented Generation parameters
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label>Top-K Documents: {settings.rag_k}</Label>
                            </div>
                            <Slider
                                value={[settings.rag_k]}
                                min={1}
                                max={10}
                                step={1}
                                onValueChange={(value) => setSettings({ ...settings, rag_k: value[0] })}
                                className="py-4"
                            />
                            <p className="text-xs text-muted-foreground">
                                Number of relevant documents to retrieve for context generation. Higher values provide more context but may increase latency.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* System Preferences */}
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-emerald-600" />
                            System Preferences
                        </CardTitle>
                        <CardDescription>
                            General application settings and notifications
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between space-x-2">
                            <div className="space-y-0.5">
                                <Label className="text-base">Email Notifications</Label>
                                <p className="text-sm text-muted-foreground">
                                    Send automated emails to students upon test completion
                                </p>
                            </div>
                            <Switch
                                checked={settings.email_notifications}
                                onCheckedChange={(checked) => setSettings({ ...settings, email_notifications: checked })}
                            />
                        </div>

                        <div className="pt-4 border-t">
                            <div className="rounded-md bg-slate-100 dark:bg-slate-900 p-4">
                                <p className="text-sm font-medium mb-2">Current Configuration</p>
                                <div className="text-xs font-mono space-y-1 text-slate-600 dark:text-slate-400">
                                    <p>Environment: {import.meta.env.MODE}</p>
                                    <p>Backend URL: {import.meta.env.VITE_BACKEND_URL}</p>
                                    <p>RAG Status: Active</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Settings;
