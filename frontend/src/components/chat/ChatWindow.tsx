
import SafeMathMarkdown from '@/components/SafeMathMarkdown';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { MoreVertical, Phone, Send, Users, Video } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage, ChatUser } from './types';

interface ChatWindowProps {
    selectedUser: ChatUser | null;
    messages: ChatMessage[];
    onSendMessage: (content: string) => void;
    currentUserId: string; // The ID of the logged-in user (Admin or Student)
    isLoading?: boolean;
}

export function ChatWindow({
    selectedUser,
    messages,
    onSendMessage,
    currentUserId,
    isLoading = false
}: ChatWindowProps) {
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, selectedUser]); // Scroll on new message or user switch

    const handleSend = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (inputValue.trim()) {
            onSendMessage(inputValue);
            setInputValue('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!selectedUser) {
        return (
            <div className="flex-1 flex items-center justify-center bg-neutral-50 dark:bg-slate-950 h-full">
                <div className="text-center p-8">
                    <div className="w-16 h-16 bg-neutral-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-neutral-300 dark:text-slate-600" />
                    </div>
                    <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">Select a conversation</h3>
                    <p className="text-neutral-500 dark:text-slate-400 text-sm max-w-xs mx-auto">
                        Choose a contact from the left sidebar to start chatting or view history.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-950">
            {/* Header */}
            <div className="h-16 border-b border-neutral-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 bg-white dark:bg-slate-900">
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={selectedUser.avatar} />
                        <AvatarFallback>{selectedUser.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">{selectedUser.name}</h2>
                        <div className="flex items-center gap-1.5">
                            {selectedUser.status === 'online' && (
                                <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block" />
                            )}
                            <span className="text-xs text-neutral-500 dark:text-slate-400 capitalize">
                                {selectedUser.status || 'offline'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="text-neutral-500 dark:text-slate-400">
                        <Phone className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-neutral-500 dark:text-slate-400">
                        <Video className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-neutral-500 dark:text-slate-400">
                        <MoreVertical className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-hidden relative bg-neutral-50/50 dark:bg-slate-950">
                <ScrollArea className="h-full px-4 md:px-6">
                    <div className="py-6 space-y-6">
                        {messages.length === 0 ? (
                            <div className="text-center py-10">
                                <p className="text-sm text-neutral-400 dark:text-slate-500">No messages yet. Start the conversation!</p>
                            </div>
                        ) : (
                            messages.map((msg, index) => {
                                const isMe = msg.senderId === currentUserId;
                                return (
                                    <motion.div
                                        key={msg.id || index}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={cn(
                                            "flex w-full",
                                            isMe ? "justify-end" : "justify-start"
                                        )}
                                    >
                                        <div className={cn(
                                            "max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 shadow-sm",
                                            isMe
                                                ? "bg-neutral-900 dark:bg-emerald-600 text-white rounded-br-none"
                                                : "bg-white dark:bg-slate-800 border border-neutral-100 dark:border-slate-700 text-neutral-800 dark:text-slate-100 rounded-bl-none"
                                        )}>
                                            <div className={cn("prose prose-sm max-w-none dark:prose-invert", isMe ? "prose-invert" : "")}>
                                                <SafeMathMarkdown content={msg.content} />
                                            </div>
                                            <p className={cn(
                                                "text-[10px] mt-1 text-right opacity-70",
                                                isMe ? "text-neutral-300" : "text-neutral-400"
                                            )}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-neutral-200 dark:border-slate-800 shrink-0">
                <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex items-center gap-3">
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Message ${selectedUser.name}...`}
                        className="h-12 py-3 px-4 rounded-xl bg-neutral-50 dark:bg-slate-800 border-neutral-200 dark:border-slate-700 focus-visible:ring-neutral-900 dark:focus-visible:ring-emerald-500"
                        disabled={isLoading}
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!inputValue.trim() || isLoading}
                        className="h-12 w-12 rounded-xl bg-neutral-900 dark:bg-emerald-600 hover:bg-neutral-800 dark:hover:bg-emerald-700 text-white shadow-sm shrink-0"
                    >
                        <Send className="w-5 h-5" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
