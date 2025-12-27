import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Bot, History, MessageCircle, Minimize2, Plus, Send } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import SafeMathMarkdown from './SafeMathMarkdown';

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface ChatSession {
    id: string;
    title: string;
    timestamp: number;
    preview?: string;
    message_count?: number;
}
const MessageList = React.memo(({ messages, isLoading, isStreaming }: { messages: Message[], isLoading: boolean, isStreaming: boolean }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isStreaming]);

    return (
        <div className="space-y-4">
            {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-3 px-4 shadow-sm ${msg.role === 'user'
                        ? 'bg-emerald-600 text-white rounded-tr-none'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-700'
                        }`}>
                        <div className={`prose prose-sm dark:prose-invert max-w-none ${msg.role === 'user' ? 'text-white' : ''}`}>
                            <SafeMathMarkdown content={msg.content} />
                        </div>
                    </div>
                </div>
            ))}
            {isLoading && !isStreaming && (
                <div className="flex justify-start">
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-none p-3 border border-slate-200 dark:border-slate-700">
                        <div className="flex gap-1">
                            <span className="animate-bounce delay-0">●</span>
                            <span className="animate-bounce delay-150">●</span>
                            <span className="animate-bounce delay-300">●</span>
                        </div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );
});


export function StudentChatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);

    const { toast } = useToast();
    const [studentId, setStudentId] = useState<string | null>(null);
    // Use a dynamic thread ID to allow multiple sessions. Persist in session storage for reload.
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
    const [historyList, setHistoryList] = useState<ChatSession[]>([]);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    const BackendURL = import.meta.env.VITE_BACKEND_URL;

    useEffect(() => {
        // Get student ID
        const fetchUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const storedId = sessionStorage.getItem('studentId');
                if (storedId) {
                    setStudentId(storedId);

                    // Initialize Thread ID
                    // Check if we have an active thread for this student
                    let activeThread = localStorage.getItem(`activeThread_${storedId}`);
                    if (!activeThread) {
                        // Default to main chat
                        activeThread = `chat_${storedId}`;
                        localStorage.setItem(`activeThread_${storedId}`, activeThread);
                    }
                    setCurrentThreadId(activeThread);
                    loadHistory(activeThread);
                }
            }
        };
        fetchUser();
    }, [isOpen]); // Reload when opened to check for new notifications





    const loadHistory = async (threadId: string) => {
        try {
            const token = (await supabase.auth.getSession()).data.session?.access_token;
            // set messages to empty while loading?
            // setMessages([]); 

            const res = await fetch(`${BackendURL}/api/bot/history/${threadId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const history = await res.json();
                if (Array.isArray(history)) {
                    // Filter out empty messages
                    const validHistory = history.filter((m: any) => m.content && m.content.trim() !== "");
                    setMessages(validHistory);
                } else {
                    setMessages([]);
                }
            }
        } catch (e) {
            console.error("Failed to load history", e);
        }
    };

    const fetchChatList = async () => {
        if (!studentId) return;
        try {
            const token = (await supabase.auth.getSession()).data.session?.access_token;
            // Cache buster
            const res = await fetch(`${BackendURL}/api/bot/history/list?t=${Date.now()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const list = await res.json();
                console.log("Chat List Received:", list);
                // DEBUG TOAST
                toast({ title: "Debug History", description: `Backend returned ${list.length} items.` });

                if (list.length > 0 && list[0].id === 'debug_info') {
                    // Show critical debug info from backend
                    console.log("BACKEND DEBUG ON", list[0]);
                }

                setHistoryList(list);
            } else {
                console.error("Fetch failed", res.status);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSwitchChat = (threadId: string) => {
        if (threadId === currentThreadId) return;
        setCurrentThreadId(threadId);
        if (studentId) {
            localStorage.setItem(`activeThread_${studentId}`, threadId);
        }
        loadHistory(threadId);
        setIsHistoryOpen(false);
    };

    const handleNewChat = () => {
        if (!studentId) return;

        // Generate a new thread ID (timestamp based unique ID)
        const newThreadId = `chat_${studentId}_${Date.now()}`;
        setCurrentThreadId(newThreadId);
        setMessages([]); // Clear view
        localStorage.setItem(`activeThread_${studentId}`, newThreadId);

        toast({ title: "New Chat Started", description: "Conversation context has been reset." });
    };

    const handleSend = async () => {
        if (!input.trim() || !studentId || !currentThreadId || isLoading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);
        setIsStreaming(true);

        try {
            const token = (await supabase.auth.getSession()).data.session?.access_token;

            const response = await fetch(`${BackendURL}/api/bot/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: userMsg,
                    student_id: studentId,
                    thread_id: currentThreadId // Use dynamic thread ID
                })
            });

            if (!response.ok) throw new Error("Network error");

            // Set up reader
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error("No reader");

            let aiContent = "";
            // Add placeholder
            setMessages(prev => [...prev, { role: 'assistant', content: "" }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.replace('data: ', '');
                        if (dataStr === '[DONE]') break;

                        try {
                            const data = JSON.parse(dataStr);
                            if (data.type === 'token') {
                                aiContent += data.content;
                                // Update last message
                                setMessages(prev => {
                                    const newMsgs = [...prev];
                                    newMsgs[newMsgs.length - 1] = { role: 'assistant', content: aiContent };
                                    return newMsgs;
                                });
                            }
                        } catch (e) {
                            // ignore parse errors for partial chunks
                        }
                    }
                }
            }

        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
            // Remove the placeholder if failed? Or leave it with error text?
            setMessages(prev => {
                const newMsgs = [...prev];
                if (newMsgs[newMsgs.length - 1].role === 'assistant' && newMsgs[newMsgs.length - 1].content === "") {
                    newMsgs.pop();
                }
                return newMsgs;
            });
        } finally {
            setIsLoading(false);
            setIsStreaming(false);
        }
    };

    if (!isOpen) {
        return (
            <Button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 left-6 h-14 w-14 rounded-full shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white z-50 transition-all hover:scale-105"
            >
                <Bot className="h-8 w-8" />
            </Button>
        );
    }

    return (
        <Card className="fixed bottom-6 left-6 w-96 h-[600px] shadow-2xl flex flex-col z-50 border-emerald-100 dark:border-emerald-900 bg-white/95 dark:bg-slate-900/95 backdrop-blur animate-in slide-in-from-bottom-10 fade-in duration-300">
            <CardHeader className="p-4 border-b bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-full">
                        <Bot className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <CardTitle className="text-lg text-emerald-950 dark:text-emerald-50">AdmitAI Tutor</CardTitle>
                        <p className="text-xs text-muted-foreground">Always here to help!</p>
                    </div>
                </div>
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={handleNewChat} title="New Chat">
                        <Plus className="h-4 w-4" />
                    </Button>

                    <Popover open={isHistoryOpen} onOpenChange={(open) => {
                        setIsHistoryOpen(open);
                        if (open) fetchChatList();
                    }}>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="History">
                                <History className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2 bg-white dark:bg-slate-900 shadow-xl border-slate-200 dark:border-slate-800" align="end">
                            <h4 className="font-medium text-sm mb-2 px-2 text-slate-500">Previous Chats</h4>
                            <ScrollArea className="h-64">
                                {historyList.length === 0 ? (
                                    <p className="text-xs text-center text-slate-400 py-4">No history found</p>
                                ) : (
                                    historyList.map(chat => (
                                        <button
                                            key={chat.id}
                                            onClick={() => handleSwitchChat(chat.id)}
                                            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${chat.id === currentThreadId
                                                ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100 font-medium'
                                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                }`}
                                        >
                                            <div className="truncate font-medium">{chat.title}</div>
                                            {chat.preview && <div className="text-xs text-slate-400 truncate mt-0.5">{chat.preview}</div>}
                                        </button>
                                    ))
                                )}
                            </ScrollArea>
                        </PopoverContent>
                    </Popover>

                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setIsOpen(false)}>
                        <Minimize2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="flex-1 p-0 overflow-hidden relative">
                <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]" />

                <ScrollArea className="h-full p-4 relative">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground space-y-4 pt-20">
                            <div className="bg-emerald-50 dark:bg-emerald-900/30 p-4 rounded-full">
                                <MessageCircle className="h-8 w-8 text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground mb-1">Welcome!</h3>
                                <p className="text-sm">I analyze your test results to help you improve. Ask me anything or request a quick brainstorm before your next test!</p>
                            </div>
                        </div>
                    ) : (
                        <MessageList messages={messages} isLoading={isLoading} isStreaming={isStreaming} />

                    )}
                </ScrollArea>
            </CardContent>

            <CardFooter className="p-3 border-t bg-background">
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="flex w-full gap-2"
                >
                    <Input
                        placeholder="Ask for help or brainstorming..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        disabled={isLoading}
                        className="flex-1 focus-visible:ring-emerald-500"
                    />
                    <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="bg-emerald-600 hover:bg-emerald-700">
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </CardFooter>
        </Card>
    );
}
