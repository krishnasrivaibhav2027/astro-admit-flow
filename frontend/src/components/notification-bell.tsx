import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Calendar, Megaphone, MessageSquare, Pin } from "lucide-react";
import { useEffect, useState } from "react";

interface Announcement {
    id: string;
    title: string;
    content: string;
    created_at: string;
}

export function NotificationBell() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        fetchAnnouncements();
        fetchMessages();
        // Poll every minute for new announcements and messages
        const interval = setInterval(() => {
            fetchAnnouncements();
            fetchMessages();
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchMessages = async () => {
        try {
            const studentId = sessionStorage.getItem("studentId");
            if (!studentId) return;

            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            // Fetch unread messages
            // We need an endpoint to get unread messages details, not just count.
            // But chat_routes only has unread count.
            // Let's modify chat_routes to get unread messages or just fetch history and filter.
            // Or just show a generic "You have X new messages" notification.
            // The user said "it will appear as the notification... then the student can click on the contact admin".

            // Let's fetch unread count for now.
            const response = await fetch(`${backendUrl}/api/chat/unread?user_id=${studentId}&user_type=student`);
            if (response.ok) {
                const data = await response.json();
                if (data.count > 0) {
                    setMessages([{
                        id: 'msg-notification',
                        title: 'New Messages',
                        content: `You have ${data.count} unread message(s) from admins.`,
                        created_at: new Date().toISOString(),
                        type: 'message'
                    }]);
                    setUnreadCount(prev => prev + data.count);
                } else {
                    setMessages([]);
                }
            }
        } catch (error) {
            console.error("Failed to fetch messages:", error);
        }
    };

    const fetchAnnouncements = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) return;

            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await fetch(`${backendUrl}/api/student/announcements`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setAnnouncements(data);

                const lastReadId = localStorage.getItem("last_read_announcement_id");
                if (data.length > 0) {
                    if (data[0].id !== lastReadId) {
                        setUnreadCount(prev => prev + data.length);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to fetch announcements:", error);
        }
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (open) {
            if (announcements.length > 0) {
                localStorage.setItem("last_read_announcement_id", announcements[0].id);
            }
            setUnreadCount(0);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background animate-pulse" />
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px] border-l border-border/50 bg-white dark:bg-background shadow-2xl">
                <SheetHeader className="mb-6 text-left">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                            <Megaphone className="w-5 h-5" />
                        </div>
                        <SheetTitle className="text-xl">Notifications</SheetTitle>
                    </div>
                    <SheetDescription className="text-base">
                        Stay updated with latest news and messages
                    </SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-140px)] pr-4 -mr-4">
                    <div className="space-y-4 pr-4 pb-4">
                        {/* Messages Section */}
                        {messages.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Messages</h3>
                                {messages.map((msg) => (
                                    <Card key={msg.id} className="border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                                        <CardContent className="p-4 flex items-start gap-4">
                                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                                <MessageSquare className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-base">{msg.title}</h4>
                                                <p className="text-sm text-muted-foreground">{msg.content}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {/* Announcements Section */}
                        <div>
                            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Announcements</h3>
                            {announcements.length > 0 ? (
                                announcements.map((announcement, index) => (
                                    <Card key={announcement.id} className="border bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-card/80 transition-colors overflow-hidden shadow-sm mb-4">
                                        <div className={`h-1 w-full ${index === 0 ? 'bg-gradient-to-r from-purple-500 to-blue-500' : 'bg-transparent'}`} />
                                        <CardContent className="p-5">
                                            <div className="flex items-start gap-4">
                                                <div className={`p-2 rounded-lg ${index === 0 ? 'bg-purple-500/10 text-purple-500' : 'bg-muted text-muted-foreground'}`}>
                                                    <Pin className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <h4 className="font-semibold text-base leading-none">
                                                        {announcement.title}
                                                    </h4>
                                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                                        {announcement.content}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                                                        <Calendar className="w-3 h-3" />
                                                        <span>
                                                            {new Date(announcement.created_at).toLocaleDateString(undefined, {
                                                                year: 'numeric',
                                                                month: 'long',
                                                                day: 'numeric'
                                                            })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground space-y-3">
                                    <div className="p-4 rounded-full bg-muted/50">
                                        <Bell className="w-8 h-8 opacity-50" />
                                    </div>
                                    <p>No announcements yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
