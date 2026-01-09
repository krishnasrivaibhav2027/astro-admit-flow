import SafeMathMarkdown from '@/components/SafeMathMarkdown';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowLeft,
    Bot,
    Calendar,
    Database,
    FileSpreadsheet,
    History,
    LineChart,
    Loader2,
    MessageCircle,
    Minimize2,
    Plus,
    Send,
    Sparkles,
    Trash2,
    Users
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    toolCalls?: { name: string; arguments: Record<string, unknown> }[];
    data?: Record<string, unknown>;
}

interface ChatSession {
    id: string;
    title: string;
    timestamp: number;
    preview?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

const STORAGE_KEYS = {
    THREADS: 'admin_chat_threads',
    MESSAGES_PREFIX: 'admin_chat_messages_'
};

// Memoized Message List Component
const MessageList = React.memo(({ messages, isLoading, renderDataVisualization }: {
    messages: Message[],
    isLoading: boolean,
    renderDataVisualization: (data: any) => React.ReactNode
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    return (
        <div className="space-y-6 pb-4">
            <AnimatePresence>
                {messages.map((msg, idx) => (
                    <motion.div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${msg.role === 'user'
                            ? 'bg-emerald-600 text-white rounded-br-none'
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none border border-emerald-100 dark:border-slate-700'
                            }`}>
                            {msg.role === 'assistant' ? (
                                <>
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                        <SafeMathMarkdown content={msg.content} />
                                    </div>
                                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                                        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                                            <p className="text-xs text-slate-400 flex items-center gap-1">
                                                <Sparkles className="w-3 h-3 text-emerald-500" />
                                                Used: {msg.toolCalls.map(t => t.name).join(', ')}
                                            </p>
                                        </div>
                                    )}
                                    {renderDataVisualization(msg.data)}
                                </>
                            ) : (
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            )}
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            {isLoading && (
                <motion.div
                    className="flex justify-start"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-bl-none p-4 border border-emerald-100 dark:border-slate-700 shadow-sm flex items-center gap-3">
                        <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                        <span className="text-sm text-slate-500 dark:text-slate-400">Thinking...</span>
                    </div>
                </motion.div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );
});

const AdminChatbot = () => {
    const navigate = useNavigate();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [institutionId, setInstitutionId] = useState<string | null>(null);
    const [adminName, setAdminName] = useState('Admin'); // Default, will update
    const { toast } = useToast();

    // History State
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
    const [historyList, setHistoryList] = useState<ChatSession[]>([]);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // Initial Load & Admin Info
    useEffect(() => {
        const initialize = async () => {
            await fetchAdminInfo();
            loadThreadsFromStorage();
        };
        initialize();
    }, []);

    const fetchAdminInfo = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            try {
                // Get admin info
                const response = await fetch(`${API_BASE}/api/institutions/check-admin-type?email=${encodeURIComponent(session.user.email)}`, {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setAdminName(data.name || 'Admin');
                    if (data.institution_id) {
                        setInstitutionId(data.institution_id);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch admin info", e);
            }
        }
    };

    // --- Persistence Logic ---

    const loadThreadsFromStorage = () => {
        try {
            const threadsJson = localStorage.getItem(STORAGE_KEYS.THREADS);
            if (threadsJson) {
                const threads: ChatSession[] = JSON.parse(threadsJson);
                // Sort by timestamp desc
                threads.sort((a, b) => b.timestamp - a.timestamp);
                setHistoryList(threads);

                // Auto-load most recent thread if exists, else start new
                if (threads.length > 0) {
                    loadThread(threads[0].id);
                } else {
                    startNewChat();
                }
            } else {
                startNewChat();
            }
        } catch (e) {
            console.error("Error loading threads", e);
            startNewChat();
        }
    };

    const loadThread = (threadId: string) => {
        try {
            const msgsJson = localStorage.getItem(`${STORAGE_KEYS.MESSAGES_PREFIX}${threadId}`);
            if (msgsJson) {
                setMessages(JSON.parse(msgsJson));
                setCurrentThreadId(threadId);
            } else {
                // If thread exists in meta but no messages, just reset
                setMessages([]);
                setCurrentThreadId(threadId);
            }
        } catch (e) {
            console.error("Error loading message for thread", threadId, e);
        }
    };

    const startNewChat = () => {
        const newId = crypto.randomUUID();
        setCurrentThreadId(newId);
        setMessages([]);
        setIsHistoryOpen(false);
    };

    const saveMessageToStorage = (threadId: string, newMessages: Message[]) => {
        // Save Messages
        localStorage.setItem(`${STORAGE_KEYS.MESSAGES_PREFIX}${threadId}`, JSON.stringify(newMessages));

        // Update Threads List
        const threadsJson = localStorage.getItem(STORAGE_KEYS.THREADS);
        let threads: ChatSession[] = threadsJson ? JSON.parse(threadsJson) : [];

        // Determine Title and Preview
        const lastMsg = newMessages[newMessages.length - 1];
        const firstUserMsg = newMessages.find(m => m.role === 'user');

        const preview = lastMsg.content.slice(0, 50) + (lastMsg.content.length > 50 ? '...' : '');
        const title = firstUserMsg
            ? (firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : ''))
            : 'New Chat';

        const existingIdx = threads.findIndex(t => t.id === threadId);
        const sessionData: ChatSession = {
            id: threadId,
            title: existingIdx >= 0 ? threads[existingIdx].title : title, // Keep existing title if set
            timestamp: Date.now(),
            preview
        };

        if (existingIdx >= 0) {
            threads[existingIdx] = sessionData;
        } else {
            threads.unshift(sessionData);
        }

        // Sort
        threads.sort((a, b) => b.timestamp - a.timestamp);

        localStorage.setItem(STORAGE_KEYS.THREADS, JSON.stringify(threads));
        setHistoryList(threads);
    };

    const deleteThread = (threadId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent loading the thread

        const newThreads = historyList.filter(t => t.id !== threadId);
        setHistoryList(newThreads);
        localStorage.setItem(STORAGE_KEYS.THREADS, JSON.stringify(newThreads));
        localStorage.removeItem(`${STORAGE_KEYS.MESSAGES_PREFIX}${threadId}`);

        if (currentThreadId === threadId) {
            if (newThreads.length > 0) {
                loadThread(newThreads[0].id);
            } else {
                startNewChat();
            }
        }

        toast({ title: "Chat deleted", duration: 2000 });
    };

    // --- Messaging Logic ---

    const handleSend = async (customPrompt?: string) => {
        const messageToSend = customPrompt || input.trim();
        if (!messageToSend || isLoading || !currentThreadId) return;

        setInput('');
        const userMessage: Message = { role: 'user', content: messageToSend };

        // Optimistic Update
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        saveMessageToStorage(currentThreadId, updatedMessages); // Save User Msg

        setIsLoading(true);

        // Convert messages for backend context
        const conversationContext = updatedMessages.map(m => ({
            role: m.role,
            content: m.content
        })).slice(-10); // Limit context window

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Not authenticated");

            const response = await fetch(`${API_BASE}/api/admin-chatbot/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    message: messageToSend,
                    conversation_history: conversationContext,
                    institution_id: institutionId
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || "Failed to get response");
            }

            const data = await response.json();

            const assistantMessage: Message = {
                role: 'assistant',
                content: data.response,
                toolCalls: data.tool_calls,
                data: data.data
            };

            const finalMessages = [...updatedMessages, assistantMessage];
            setMessages(finalMessages);
            saveMessageToStorage(currentThreadId, finalMessages); // Save Assistant Msg

        } catch (e) {
            console.error("Send Error:", e);
            toast({
                title: "Error",
                description: e instanceof Error ? e.message : "Failed to send message.",
                variant: "destructive"
            });
            // Add error system message
            const errorMsg: Message = {
                role: 'system',
                content: "Error: Failed to process request. Please try again."
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };


    // --- Quick Actions & Visualization ---

    const quickActions = [
        { icon: Users, label: "Show my students", prompt: "List all students in my institution" },
        { icon: Database, label: "Pending requests", prompt: "Show me all pending access requests" },
        { icon: LineChart, label: "Analytics summary", prompt: "Give me an analytics summary of my institution" },
        { icon: Calendar, label: "Schedule exam", prompt: "I want to schedule an exam for a student" },
        { icon: FileSpreadsheet, label: "Export to Sheets", prompt: "Export my student list to Google Sheets" },
        { icon: Users, label: "Struggling students", prompt: "Show me students who are struggling or stuck" },
    ];

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const renderDataVisualization = (data: Record<string, unknown> | undefined) => {
        if (!data || typeof data !== 'object') return null;

        // Render students list
        if (Array.isArray((data as any).students)) {
            const students = (data as any).students;
            return (
                <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-500" /> Students Found ({students.length})
                    </p>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {students.map((s: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-xs p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                                <div>
                                    <span className="font-medium text-slate-800 dark:text-slate-200 block">{s.first_name} {s.last_name}</span>
                                    <span className="text-slate-400">{s.email}</span>
                                </div>
                                <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-1 rounded-full">Active</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        // Render access requests
        if (Array.isArray((data as any).requests)) {
            const requests = (data as any).requests;
            const pendingCount = (data as any).pending_count || requests.length;
            return (
                <div className="mt-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/50">
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-500 mb-3 flex items-center gap-2">
                        <Database className="w-4 h-4" /> Pending Requests ({pendingCount})
                    </p>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {requests.slice(0, 10).map((r: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-xs p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                <div>
                                    <span className="font-medium text-slate-800 dark:text-slate-200 block">{r.name}</span>
                                    <span className="text-slate-500">{r.email}</span>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${r.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                    }`}>{r.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        // Spreadsheet Link
        if ((data as any).spreadsheet_url) {
            return (
                <div className="mt-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900/50">
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4" /> Spreadsheet Created
                    </p>
                    <a
                        href={(data as any).spreadsheet_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                    >
                        Open in Google Sheets <ArrowLeft className="w-3 h-3 rotate-180" />
                    </a>
                </div>
            );
        }

        // Calendar Event
        if ((data as any).event_link) {
            return (
                <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900/50">
                    <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Event Scheduled
                    </p>
                    <a
                        href={(data as any).event_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                    >
                        View in Google Calendar <ArrowLeft className="w-3 h-3 rotate-180" />
                    </a>
                </div>
            );
        }

        return null;
    };


    return (
        <div className="-m-8 h-[calc(100vh-88px)] flex flex-col bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                        <Bot className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="font-bold text-slate-800 dark:text-white leading-tight">Admin Assistant</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">MCP-Powered Tools</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={startNewChat}
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                    >
                        <Plus className="w-4 h-4 mr-2" /> New Chat
                    </Button>

                    <Popover open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="icon" className="border-slate-200 dark:border-slate-800">
                                <History className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-2 mr-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-xl" align="end">
                            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">History</span>
                                <span className="text-xs text-slate-400">{historyList.length} chats</span>
                            </div>
                            <ScrollArea className="h-[300px]">
                                <div className="space-y-1 p-1">
                                    {historyList.length === 0 ? (
                                        <div className="text-center py-8 text-slate-400 text-xs">No saved charts</div>
                                    ) : (
                                        historyList.map(thread => (
                                            <div
                                                key={thread.id}
                                                className={`group flex items-center gap-2 p-2 rounded-lg text-left transition-all cursor-pointer ${thread.id === currentThreadId
                                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900'
                                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
                                                    }`}
                                                onClick={() => {
                                                    loadThread(thread.id);
                                                    setIsHistoryOpen(false);
                                                }}
                                            >
                                                <MessageCircle className={`w-4 h-4 shrink-0 ${thread.id === currentThreadId ? 'text-emerald-500' : 'text-slate-400'
                                                    }`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-medium truncate ${thread.id === currentThreadId ? 'text-emerald-900 dark:text-emerald-100' : 'text-slate-700 dark:text-slate-300'
                                                        }`}>{thread.title}</p>
                                                    <p className="text-xs text-slate-400 truncate">{thread.preview}</p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-500"
                                                    onClick={(e) => deleteThread(thread.id, e)}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </PopoverContent>
                    </Popover>

                    <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
                        <Minimize2 className="w-4 h-4 text-slate-500" />
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden relative flex flex-col w-full min-h-0">
                <ScrollArea className="flex-1 h-full">
                    <div className="flex flex-col p-4 md:p-6">
                        {messages.length === 0 ? (
                            <motion.div
                                className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-10"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.4 }}
                            >
                                <div className="relative mb-2">
                                    <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full" />
                                    <div className="relative w-20 h-20 bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex items-center justify-center border border-emerald-100 dark:border-emerald-900">
                                        <Bot className="w-10 h-10 text-emerald-500" />
                                    </div>
                                </div>

                                <div className="space-y-2 max-w-lg">
                                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                                        {getGreeting()}, <span className="text-emerald-600 dark:text-emerald-400">{adminName}</span>
                                    </h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        I can help you manage your institution. Try asking about students, scheduling exams, or generating reports.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-2xl px-2">
                                    {quickActions.map((action, i) => (
                                        <motion.button
                                            key={i}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.1 * i }}
                                            onClick={() => handleSend(action.prompt)}
                                            disabled={isLoading}
                                            className="flex flex-col items-center gap-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-md transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 flex items-center justify-center transition-colors">
                                                <action.icon className="w-4 h-4 text-slate-500 group-hover:text-emerald-600 dark:text-slate-400 dark:group-hover:text-emerald-400" />
                                            </div>
                                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{action.label}</span>
                                        </motion.button>
                                    ))}
                                </div>
                            </motion.div>
                        ) : (
                            <MessageList
                                messages={messages}
                                isLoading={isLoading}
                                renderDataVisualization={renderDataVisualization}
                            />
                        )}
                    </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
                    <div className="w-full relative flex items-center gap-3">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your request here..."
                            className="h-12 pl-4 pr-12 rounded-2xl border-slate-200 dark:border-slate-700 focus-visible:ring-emerald-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                            disabled={isLoading}
                        />
                        <Button
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isLoading}
                            size="icon"
                            className="absolute right-2 h-8 w-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all hover:scale-105"
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                    <p className="text-[10px] text-center text-slate-400 mt-2">
                        AI can make mistakes. Please verify important information.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminChatbot;
