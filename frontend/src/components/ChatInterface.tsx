import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Maximize2, Minimize2, Send, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Message {
    id: string;
    sender_id: string;
    sender_type: string;
    receiver_id: string;
    receiver_type: string;
    content: string;
    created_at: string;
    is_read: boolean;
}

interface ChatInterfaceProps {
    currentUserId: string;
    currentUserType: 'student' | 'admin';
    targetUserId: string;
    targetUserType: 'student' | 'admin';
    targetUserName: string;
    onClose?: () => void;
    onExpand?: () => void;
    isExpanded?: boolean;
}

export function ChatInterface({
    currentUserId,
    currentUserType,
    targetUserId,
    targetUserType,
    targetUserName,
    onClose,
    onExpand,
    isExpanded = false
}: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchHistory();
        const interval = setInterval(fetchHistory, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, [targetUserId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }, [messages]);

    const prevMessagesLength = useRef(0);

    // Sound Effects using Web Audio API
    const playSentSound = () => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = "sine";
            osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);

            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        } catch (e) {
            console.error("Audio play failed", e);
        }
    };

    const playReceivedSound = () => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();

            // First beep
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.connect(gain1);
            gain1.connect(ctx.destination);

            osc1.type = "sine";
            osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
            gain1.gain.setValueAtTime(0.1, ctx.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

            osc1.start();
            osc1.stop(ctx.currentTime + 0.1);

            // Second beep
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);

            osc2.type = "sine";
            osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
            gain2.gain.setValueAtTime(0.1, ctx.currentTime + 0.15);
            gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

            osc2.start(ctx.currentTime + 0.15);
            osc2.stop(ctx.currentTime + 0.25);
        } catch (e) {
            console.error("Audio play failed", e);
        }
    };

    const fetchHistory = async () => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await fetch(
                `${backendUrl}/api/chat/history?user1_id=${currentUserId}&user1_type=${currentUserType}&user2_id=${targetUserId}&user2_type=${targetUserType}`
            );
            if (response.ok) {
                const data = await response.json();

                // Check for new messages to play sound
                if (data.length > prevMessagesLength.current && prevMessagesLength.current > 0) {
                    const lastMsg = data[data.length - 1];
                    if (lastMsg.sender_id !== currentUserId) {
                        playReceivedSound();
                    }
                }
                prevMessagesLength.current = data.length;

                setMessages(data);

                // Mark messages as read if they are from target user
                const unreadIds = data
                    .filter((m: Message) => m.sender_id === targetUserId && !m.is_read)
                    .map((m: Message) => m.id);

                if (unreadIds.length > 0) {
                    markAsRead(unreadIds);
                }
            }
        } catch (error) {
            console.error("Failed to fetch chat history:", error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (messageIds: string[]) => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            await fetch(`${backendUrl}/api/chat/mark_read`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message_ids: messageIds })
            });
        } catch (error) {
            console.error("Failed to mark messages as read:", error);
        }
    };

    const handleSend = async () => {
        if (!newMessage.trim()) return;

        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await fetch(`${backendUrl}/api/chat/send`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sender_id: currentUserId,
                    sender_type: currentUserType,
                    receiver_id: targetUserId,
                    receiver_type: targetUserType,
                    content: newMessage
                })
            });

            if (response.ok) {
                const sentMessage = await response.json();
                setMessages([...messages, sentMessage]);
                prevMessagesLength.current = messages.length + 1; // Update ref to avoid double sound or missed sound logic
                setNewMessage("");
                playSentSound();
            }
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    };

    return (
        <Card className={`flex flex-col shadow-xl border-2 transition-all duration-300 rounded-2xl overflow-hidden ${isExpanded ? 'w-full h-full' : 'w-full max-w-md h-[600px]'}`}>
            <CardHeader className="border-b p-4 bg-muted/50 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2 text-base">
                    <div className="p-2 rounded-full bg-emerald-500/10 dark:bg-emerald-900/30">
                        <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    {targetUserName}
                </CardTitle>
                <div className="flex items-center gap-2">
                    {onExpand && (
                        <Button variant="ghost" size="icon" onClick={onExpand} className="h-8 w-8">
                            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full p-4">
                    <div className="space-y-4">
                        {loading ? (
                            <div className="text-center text-muted-foreground text-sm py-8">Loading...</div>
                        ) : messages.length === 0 ? (
                            <div className="text-center text-muted-foreground text-sm py-8">
                                No messages yet. Start the conversation!
                            </div>
                        ) : (
                            messages.map((msg) => {
                                const isMe = msg.sender_id === currentUserId;
                                return (
                                    <div
                                        key={msg.id}
                                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                                    >
                                        <div
                                            className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${isMe
                                                ? "bg-emerald-600 text-white rounded-br-none shadow-md shadow-emerald-500/20"
                                                : "bg-muted text-foreground rounded-bl-none"
                                                }`}
                                        >
                                            {msg.content}
                                            <span className="text-[10px] opacity-70 mt-1 block">
                                                {new Date(msg.created_at).toLocaleTimeString("en-IN", {
                                                    timeZone: "Asia/Kolkata",
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={scrollRef} />
                    </div>
                </ScrollArea>
            </CardContent>
            <CardFooter className="p-4 border-t bg-background">
                <div className="flex w-full gap-2">
                    <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        className="flex-1"
                    />
                    <Button size="icon" onClick={handleSend} disabled={!newMessage.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}
