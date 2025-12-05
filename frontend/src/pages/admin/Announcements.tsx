import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Megaphone, Send } from "lucide-react";
import { useEffect, useState } from "react";

interface Announcement {
    id: string;
    title: string;
    content: string;
    target_audience: string;
    created_at: string;
}

const Announcements = () => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [audience, setAudience] = useState("all");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            const token = localStorage.getItem("firebase_token");
            const backendUrl = import.meta.env.VITE_BACKEND_URL;

            const response = await fetch(`${backendUrl}/api/admin/announcements`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error("Failed to fetch announcements");

            const data = await response.json();
            setAnnouncements(data);
        } catch (error) {
            console.error("Error:", error);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem("firebase_token");
            const backendUrl = import.meta.env.VITE_BACKEND_URL;

            const response = await fetch(`${backendUrl}/api/admin/announcements`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title,
                    content,
                    target_audience: audience
                })
            });

            if (!response.ok) throw new Error("Failed to create announcement");

            toast({
                title: "Success",
                description: "Announcement posted successfully",
            });

            setTitle("");
            setContent("");
            fetchAnnouncements();
        } catch (error) {
            console.error("Error:", error);
            toast({
                title: "Error",
                description: "Failed to post announcement",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Announcements</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Create Form */}
                <Card className="lg:col-span-1 h-fit bg-card/30 dark:bg-slate-900/30 backdrop-blur-md border-white/10 shadow-xl">
                    <CardHeader>
                        <CardTitle>Create New Announcement</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Title</label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Important update..."
                                    className="bg-background/50 dark:bg-slate-950/50 border-white/10"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Target Audience</label>
                                <Select value={audience} onValueChange={setAudience}>
                                    <SelectTrigger className="bg-background/50 dark:bg-slate-950/50 border-white/10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Users</SelectItem>
                                        <SelectItem value="students">Students Only</SelectItem>
                                        <SelectItem value="passed_students">Passed Students Only</SelectItem>
                                        <SelectItem value="teachers">Teachers Only</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Content</label>
                                <Textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Write your message here..."
                                    className="min-h-[150px] bg-background/50 dark:bg-slate-950/50 border-white/10"
                                    required
                                />
                            </div>

                            <Button type="submit" variant="outline" className="w-full bg-emerald-500 text-white border-emerald-500 hover:bg-white hover:text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500 dark:border-emerald-500/20 dark:hover:bg-white dark:hover:text-emerald-500" disabled={loading}>
                                {loading ? "Posting..." : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" />
                                        Post Announcement
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* List */}
                <Card className="lg:col-span-2 bg-card/30 dark:bg-slate-900/30 backdrop-blur-md border-white/10 shadow-xl">
                    <CardHeader>
                        <CardTitle>Recent Announcements</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {announcements.map((announcement) => (
                                <div key={announcement.id} className="border border-border/50 rounded-lg p-4 space-y-2 bg-background/50 dark:bg-slate-950/50">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-semibold text-lg">{announcement.title}</h3>
                                        <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded-full capitalize border border-border/50">
                                            {announcement.target_audience}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                        {announcement.content}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                                        <Megaphone className="h-3 w-3" />
                                        Posted on {new Date(announcement.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
                                    </div>
                                </div>
                            ))}

                            {announcements.length === 0 && (
                                <div className="text-center py-12 text-muted-foreground">
                                    No announcements yet.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Announcements;
