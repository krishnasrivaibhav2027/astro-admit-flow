
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { MoreVertical, Plus, Search } from 'lucide-react';
import { ChatUser } from './types';

interface ChatSidebarProps {
    users: ChatUser[];
    selectedUserId: string | null;
    onSelectUser: (id: string) => void;
    onNewChat: () => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    activeTab: 'all' | 'unread' | 'archived';
    onTabChange: (tab: 'all' | 'unread' | 'archived') => void;
    title?: string;
}

export function ChatSidebar({
    users,
    selectedUserId,
    onSelectUser,
    onNewChat,
    searchQuery,
    onSearchChange,
    activeTab,
    onTabChange,
    title = "Conversations"
}: ChatSidebarProps) {

    // Filter logic can be here or parent, assuming parent filters activeTab but search might be local?
    // Let's assume parent passes filtered users for simplicity, OR we filter here.
    // Usually better to filter here if raw list passed.
    // But let's assume 'users' passed in are ALREADY the ones to display (filtered by tab).
    // Local search filtering:
    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900">
            {/* Top Header */}
            <div className="px-6 pt-6 pb-2 shrink-0">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{title}</h1>
                    <div className="flex gap-2">
                        <Button
                            onClick={onNewChat}
                            className="bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                            size="sm"
                        >
                            <Plus className="w-4 h-4 mr-2" /> New Chat
                        </Button>
                        <Button variant="outline" size="icon" className="w-9 h-9">
                            <MoreVertical className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                        </Button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-10 bg-white dark:bg-slate-950 border-neutral-200 dark:border-slate-800"
                    />
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-neutral-100 dark:bg-slate-800 rounded-lg mb-2">
                    {(['all', 'unread', 'archived'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => onTabChange(tab)}
                            className={cn(
                                "flex-1 py-1.5 text-xs font-medium rounded-md transition-all capitalize",
                                activeTab === tab
                                    ? "bg-white dark:bg-slate-700 text-neutral-900 dark:text-neutral-100 shadow-sm"
                                    : "text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-slate-200"
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* User List */}
            <ScrollArea className="flex-1">
                <div className="flex flex-col">
                    {filteredUsers.length === 0 ? (
                        <div className="p-8 text-center text-neutral-500 dark:text-slate-400 text-sm">
                            No conversations found.
                        </div>
                    ) : (
                        filteredUsers.map((user) => (
                            <div
                                key={user.id}
                                onClick={() => onSelectUser(user.id)}
                                className={cn(
                                    "px-6 py-4 cursor-pointer transition-colors border-b border-neutral-100 dark:border-slate-800/50 hover:bg-neutral-50 dark:hover:bg-slate-800/50",
                                    selectedUserId === user.id ? "bg-neutral-50 dark:bg-slate-800 border-l-4 border-l-emerald-500 pl-[20px]" : ""
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <Avatar className={cn(
                                            "h-10 w-10",
                                            // user.id % 3 ... logic for coloring if no avatar
                                            !user.avatar && "bg-slate-200 dark:bg-slate-700"
                                        )}>
                                            <AvatarImage src={user.avatar} />
                                            <AvatarFallback className="text-xs">
                                                {user.name.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        {user.status === 'online' && (
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className={cn(
                                                "text-sm font-medium truncate",
                                                user.unreadCount > 0 ? "text-neutral-900 dark:text-white" : "text-neutral-700 dark:text-slate-300"
                                            )}>
                                                {user.name}
                                            </p>
                                            {user.lastMessageTime && (
                                                <span className="text-[10px] text-neutral-400 dark:text-slate-500 whitespace-nowrap ml-2">
                                                    {user.lastMessageTime}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className={cn(
                                                "text-xs truncate max-w-[140px]",
                                                user.unreadCount > 0 ? "text-neutral-800 dark:text-slate-300 font-medium" : "text-neutral-500 dark:text-slate-500"
                                            )}>
                                                {user.lastMessage || "No messages yet"}
                                            </p>
                                            {user.unreadCount > 0 && (
                                                <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-600">
                                                    {user.unreadCount}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
