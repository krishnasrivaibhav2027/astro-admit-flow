import SafeMathMarkdown from '@/components/SafeMathMarkdown';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Bot, History, Menu, Plus, Search, Send, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface ChatSession {
    id: string;
    title: string;
    timestamp: string;
    preview?: string;
    message_count?: number;
}

const TarsAI = () => {
    const navigate = useNavigate();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const [studentId, setStudentId] = useState<string | null>(null);
    const [studentName, setStudentName] = useState<string>('Student');
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
    const [historyList, setHistoryList] = useState<ChatSession[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const BackendURL = import.meta.env.VITE_BACKEND_URL;

    // Get greeting based on time
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const storedId = sessionStorage.getItem('studentId');
                if (storedId) {
                    setStudentId(storedId);

                    // Get student name
                    try {
                        const response = await fetch(`${BackendURL}/api/students/by-email/${session.user.email}`, {
                            headers: { 'Authorization': `Bearer ${session.access_token}` }
                        });
                        if (response.ok) {
                            const data = await response.json();
                            setStudentName(data.first_name || 'Student');
                        }
                    } catch (e) {
                        console.error("Failed to fetch student name", e);
                    }

                    let activeThread = localStorage.getItem(`activeThread_${storedId}`);
                    if (!activeThread) {
                        activeThread = `chat_${storedId}_${Date.now()}`;
                        localStorage.setItem(`activeThread_${storedId}`, activeThread);
                    }
                    setCurrentThreadId(activeThread);
                    loadHistory(activeThread);
                    // Fetch chat list with storedId directly
                    fetchChatListWithId(storedId);
                }
            }
        };
        fetchUser();
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (shouldScrollToBottom && scrollAreaRef.current) {
            // Use requestAnimationFrame to ensure DOM is updated
            requestAnimationFrame(() => {
                if (scrollAreaRef.current) {
                    scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
                }
            });
            setShouldScrollToBottom(false);
        }
    }, [shouldScrollToBottom, messages]);

    const loadHistory = async (threadId: string) => {
        try {
            const token = (await supabase.auth.getSession()).data.session?.access_token;
            const res = await fetch(`${BackendURL}/api/bot/history/${threadId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const history = await res.json();
                if (Array.isArray(history)) {
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

    const fetchChatListWithId = async (id: string) => {
        try {
            const token = (await supabase.auth.getSession()).data.session?.access_token;
            const res = await fetch(`${BackendURL}/api/bot/history/list?t=${Date.now()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const list = await res.json();
                console.log("[TARS] Fetched chat list:", list);
                setHistoryList(list);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchChatList = async () => {
        if (!studentId) return;
        await fetchChatListWithId(studentId);
    };

    const handleSwitchChat = (threadId: string) => {
        if (threadId === currentThreadId) return;
        setCurrentThreadId(threadId);
        if (studentId) {
            localStorage.setItem(`activeThread_${studentId}`, threadId);
        }
        loadHistory(threadId);
    };

    const handleNewChat = () => {
        if (!studentId) return;
        const newThreadId = `chat_${studentId}_${Date.now()}`;
        setCurrentThreadId(newThreadId);
        setMessages([]);
        localStorage.setItem(`activeThread_${studentId}`, newThreadId);
        toast({ title: "New Chat Started", description: "Start a fresh conversation!" });
    };

    const handleSend = async () => {
        if (!input.trim() || !studentId || !currentThreadId || isLoading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setShouldScrollToBottom(true);
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
                    thread_id: currentThreadId
                })
            });

            if (!response.ok) throw new Error("Network error");

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error("No reader");

            let aiContent = "";
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
                                setMessages(prev => {
                                    const updated = [...prev];
                                    if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
                                        updated[updated.length - 1].content = aiContent;
                                    }
                                    return updated;
                                });
                            } else if (data.type === 'status' && data.content) {
                                // Show tool usage status (e.g., "Generating illustration...")
                                setMessages(prev => {
                                    const updated = [...prev];
                                    if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
                                        updated[updated.length - 1].content = aiContent || data.content;
                                    }
                                    return updated;
                                });
                            } else if (data.type === 'error') {
                                console.error("Stream error:", data.content);
                                toast({
                                    title: "AI Error",
                                    description: data.content || "Something went wrong",
                                    variant: "destructive"
                                });
                            }
                        } catch { }
                    }
                }
            }
            // Refresh history list after sending
            fetchChatList();
        } catch (e) {
            console.error("Send Error:", e);
            toast({ title: "Error", description: "Failed to send message.", variant: "destructive" });
        } finally {
            setIsLoading(false);
            setIsStreaming(false);
            setShouldScrollToBottom(true);
        }
    };

    // Filter history by search
    const filteredHistory = historyList.filter(chat =>
        chat.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.preview?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Group history by time
    const groupedHistory = {
        today: filteredHistory.filter(chat => {
            const date = new Date(chat.timestamp);
            const today = new Date();
            return date.toDateString() === today.toDateString();
        }),
        week: filteredHistory.filter(chat => {
            const date = new Date(chat.timestamp);
            const today = new Date();
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return date > weekAgo && date.toDateString() !== today.toDateString();
        }),
        older: filteredHistory.filter(chat => {
            const date = new Date(chat.timestamp);
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return date <= weekAgo;
        })
    };

    return (
        <motion.div
            className="h-[calc(100vh-96px)] bg-gradient-to-br from-slate-50 via-emerald-50/30 to-blue-50/20 dark:from-slate-950 dark:via-emerald-950/20 dark:to-slate-900 overflow-hidden"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
                duration: 0.4
            }}
        >
            {/* Decorative Elements */}
            <div className="absolute top-20 right-20 w-72 h-72 bg-emerald-400/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-20 left-20 w-96 h-96 bg-blue-400/10 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex h-full p-4 gap-4 relative">
                {/* Collapsible Sidebar */}
                <div className={`${isSidebarOpen ? 'w-[500px]' : 'w-16'} flex-col h-full transition-all duration-300 hidden lg:flex`}>
                    <Card className="flex-1 flex flex-col bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-slate-200/50 dark:border-slate-800/50 shadow-xl overflow-hidden">
                        {/* Sidebar Header */}
                        <div className="p-3 border-b border-slate-200/50 dark:border-slate-800/50">
                            <div className="flex items-center justify-between">
                                {isSidebarOpen ? (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                                                <Bot className="w-4 h-4 text-white" />
                                            </div>
                                            <span className="font-bold text-slate-900 dark:text-white">T.A.R.S</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                size="sm"
                                                className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 px-2"
                                                onClick={handleNewChat}
                                            >
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => setIsSidebarOpen(false)}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex flex-col items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="w-10 h-10 mb-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 text-emerald-600 dark:text-emerald-500 rounded-xl"
                                                onClick={() => setIsSidebarOpen(true)}
                                            >
                                                <Menu className="w-5 h-5" />
                                            </Button>

                                            {/* New Chat Button (Collapsed) */}
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="w-10 h-10 mb-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm rounded-xl"
                                                            onClick={handleNewChat}
                                                        >
                                                            <Plus className="w-5 h-5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right">New Chat</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>

                                            {/* Recent Chats Popover (Collapsed) */}
                                            <Popover>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <PopoverTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="w-10 h-10 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl"
                                                                >
                                                                    <History className="w-5 h-5" />
                                                                </Button>
                                                            </PopoverTrigger>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="right">Recent Chats</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                                <PopoverContent side="right" className="w-[350px] p-0 ml-2 shadow-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/95 backdrop-blur-xl">
                                                    <div className="p-4 border-b border-slate-200/50 dark:border-slate-800/50">
                                                        <h3 className="font-semibold text-slate-900 dark:text-white">Recent Chats</h3>
                                                    </div>
                                                    <ScrollArea className="h-[400px] p-2">
                                                        {/* Reusing History Logic */}
                                                        {/* Today */}
                                                        {groupedHistory.today.length > 0 && (
                                                            <div className="mb-4">
                                                                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider px-2 mb-2">Today</p>
                                                                {groupedHistory.today.map(chat => (
                                                                    <button
                                                                        key={chat.id}
                                                                        onClick={() => handleSwitchChat(chat.id)}
                                                                        className={`w-full text-left p-3 rounded-lg mb-1 transition-all ${chat.id === currentThreadId
                                                                            ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30'
                                                                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'
                                                                            }`}
                                                                    >
                                                                        <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{chat.title}</p>
                                                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{chat.preview}</p>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* This Week */}
                                                        {groupedHistory.week.length > 0 && (
                                                            <div className="mb-4">
                                                                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider px-2 mb-2">This Week</p>
                                                                {groupedHistory.week.map(chat => (
                                                                    <button
                                                                        key={chat.id}
                                                                        onClick={() => handleSwitchChat(chat.id)}
                                                                        className={`w-full text-left p-3 rounded-lg mb-1 transition-all ${chat.id === currentThreadId
                                                                            ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30'
                                                                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'
                                                                            }`}
                                                                    >
                                                                        <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{chat.title}</p>
                                                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{chat.preview}</p>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Older */}
                                                        {groupedHistory.older.length > 0 && (
                                                            <div className="mb-4">
                                                                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider px-2 mb-2">Older</p>
                                                                {groupedHistory.older.map(chat => (
                                                                    <button
                                                                        key={chat.id}
                                                                        onClick={() => handleSwitchChat(chat.id)}
                                                                        className={`w-full text-left p-3 rounded-lg mb-1 transition-all ${chat.id === currentThreadId
                                                                            ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30'
                                                                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'
                                                                            }`}
                                                                    >
                                                                        <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{chat.title}</p>
                                                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{chat.preview}</p>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {historyList.length === 0 && (
                                                            <div className="text-center py-8 text-slate-400">
                                                                <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                                <p className="text-sm">No conversations yet</p>
                                                            </div>
                                                        )}
                                                    </ScrollArea>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </>

                                )}
                            </div>

                            {/* Search - only when open */}
                            {isSidebarOpen && (
                                <div className="relative mt-3">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="Search chats..."
                                        className="pl-9 bg-slate-100/50 dark:bg-slate-800/50 border-0 h-9"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        {/* History List - only when open */}
                        {isSidebarOpen ? (
                            <ScrollArea className="flex-1 p-2">
                                {/* Today */}
                                {groupedHistory.today.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider px-2 mb-2">Today</p>
                                        {groupedHistory.today.map(chat => (
                                            <button
                                                key={chat.id}
                                                onClick={() => handleSwitchChat(chat.id)}
                                                className={`w-full text-left p-3 rounded-lg mb-1 transition-all ${chat.id === currentThreadId
                                                    ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30'
                                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'
                                                    }`}
                                            >
                                                <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{chat.title}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{chat.preview}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* This Week */}
                                {groupedHistory.week.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider px-2 mb-2">This Week</p>
                                        {groupedHistory.week.map(chat => (
                                            <button
                                                key={chat.id}
                                                onClick={() => handleSwitchChat(chat.id)}
                                                className={`w-full text-left p-3 rounded-lg mb-1 transition-all ${chat.id === currentThreadId
                                                    ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30'
                                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'
                                                    }`}
                                            >
                                                <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{chat.title}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{chat.preview}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Older */}
                                {groupedHistory.older.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider px-2 mb-2">Older</p>
                                        {groupedHistory.older.map(chat => (
                                            <button
                                                key={chat.id}
                                                onClick={() => handleSwitchChat(chat.id)}
                                                className={`w-full text-left p-3 rounded-lg mb-1 transition-all ${chat.id === currentThreadId
                                                    ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30'
                                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'
                                                    }`}
                                            >
                                                <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{chat.title}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{chat.preview}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {filteredHistory.length === 0 && (
                                    <div className="text-center py-8 text-slate-400">
                                        <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No conversations yet</p>
                                    </div>
                                )}
                            </ScrollArea>
                        ) : (
                            <div className="flex-1" />
                        )}

                        {/* Back Button */}
                        <div className="p-2 border-t border-slate-200/50 dark:border-slate-800/50">
                            <Button
                                variant="ghost"
                                className={`w-full ${isSidebarOpen ? 'justify-start gap-2' : 'justify-center'} text-slate-600 dark:text-slate-400`}
                                onClick={() => navigate('/levels')}
                            >
                                <ArrowLeft className="w-4 h-4" />
                                {isSidebarOpen && <span>Back to Tests</span>}
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col h-full min-h-0">
                    <Card className="h-full flex flex-col bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-slate-200/50 dark:border-slate-800/50 shadow-xl overflow-hidden">
                        {/* Messages Area - explicit height minus input area */}
                        <div className="flex-1 overflow-hidden">
                            <div ref={scrollAreaRef} className="h-full overflow-y-auto scroll-smooth">
                                <div className="p-6 pb-4">
                                    {messages.length === 0 ? (
                                        /* Welcome State */
                                        <motion.div
                                            className="flex flex-col items-center justify-center min-h-[400px] text-center"
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ delay: 0.3 }}
                                        >
                                            {/* Animated Orb */}
                                            <motion.div
                                                className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400/30 via-blue-400/20 to-purple-400/30 flex items-center justify-center mb-6 relative"
                                                animate={{
                                                    boxShadow: ['0 0 30px rgba(16,185,129,0.3)', '0 0 60px rgba(16,185,129,0.5)', '0 0 30px rgba(16,185,129,0.3)']
                                                }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                            >
                                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400/50 to-blue-400/50 blur-sm absolute" />
                                                <Sparkles className="w-8 h-8 text-emerald-500 relative z-10" />
                                            </motion.div>

                                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                                                {getGreeting()}, <span className="text-emerald-500">{studentName}</span>
                                            </h1>
                                            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
                                                How Can I <span className="text-emerald-500 font-medium">Assist You Today?</span>
                                            </p>

                                            {/* Quick Actions */}
                                            <div className="flex flex-wrap justify-center gap-3 max-w-xl">
                                                {['Explain a concept', 'Help with practice', 'Review my progress'].map((action, i) => (
                                                    <motion.button
                                                        key={action}
                                                        className="px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 transition-all border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800"
                                                        onClick={() => setInput(action)}
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: 0.4 + i * 0.1 }}
                                                    >
                                                        {action}
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    ) : (
                                        /* Messages */
                                        <div className="space-y-4">
                                            <AnimatePresence>
                                                {messages.map((msg, idx) => (
                                                    <motion.div
                                                        key={idx}
                                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ duration: 0.3 }}
                                                    >
                                                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                                                            ? 'bg-emerald-500 text-white rounded-br-md'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-md'
                                                            }`}>
                                                            {msg.role === 'assistant' ? (
                                                                <SafeMathMarkdown content={msg.content} />
                                                            ) : (
                                                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>

                                            {isStreaming && (
                                                <motion.div
                                                    className="flex justify-start"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                >
                                                    <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3">
                                                        <div className="flex gap-1">
                                                            <motion.div className="w-2 h-2 bg-emerald-500 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                                                            <motion.div className="w-2 h-2 bg-emerald-500 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} />
                                                            <motion.div className="w-2 h-2 bg-emerald-500 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} />
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                            <div ref={messagesEndRef} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50">
                            <div className="max-w-3xl mx-auto">
                                <div className="relative flex items-center gap-2 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl p-2 border border-slate-200/50 dark:border-slate-700/50">
                                    <Sparkles className="w-5 h-5 text-slate-400 ml-2" />
                                    <Input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                        placeholder="Ask T.A.R.S anything..."
                                        className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-slate-900 dark:text-white placeholder:text-slate-400"
                                        disabled={isLoading}
                                    />
                                    <Button
                                        onClick={handleSend}
                                        disabled={!input.trim() || isLoading}
                                        size="icon"
                                        className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg h-9 w-9 shrink-0"
                                    >
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </motion.div>
    );
};

export default TarsAI;
