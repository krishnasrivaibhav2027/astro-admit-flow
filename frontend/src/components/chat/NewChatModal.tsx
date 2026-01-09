
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Search, UserPlus } from "lucide-react";
import { useState } from "react";
import { ChatUser } from "./types";

interface NewChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    users: ChatUser[];
    onSelectUser: (userId: string) => void;
}

export function NewChatModal({ isOpen, onClose, users, onSelectUser }: NewChatModalProps) {
    const [search, setSearch] = useState("");

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] p-0 gap-0 bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-800">
                <DialogHeader className="p-4 border-b border-neutral-100 dark:border-slate-800">
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-neutral-500" />
                        New Chat
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Search and select a user to start a conversation.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-900/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <Input
                            placeholder="Search people..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 bg-white dark:bg-slate-950"
                        />
                    </div>
                </div>

                <ScrollArea className="h-[300px]">
                    <div className="p-2">
                        {filteredUsers.length === 0 ? (
                            <div className="text-center py-8 text-neutral-400 text-sm">
                                No contacts found.
                            </div>
                        ) : (
                            filteredUsers.map(user => (
                                <button
                                    key={user.id}
                                    onClick={() => {
                                        onSelectUser(user.id);
                                        onClose();
                                    }}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors text-left group"
                                >
                                    <Avatar className="h-10 w-10 border border-neutral-200 dark:border-slate-700">
                                        <AvatarImage src={user.avatar} />
                                        <AvatarFallback className="bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-400">
                                            {user.name.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm text-neutral-900 dark:text-neutral-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                            {user.name}
                                        </p>
                                        <p className="text-xs text-neutral-500 dark:text-slate-400 truncate">
                                            {user.email}
                                        </p>
                                    </div>
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        user.status === 'online' ? "bg-emerald-500" : "bg-transparent border border-neutral-300 dark:border-slate-600"
                                    )} />
                                </button>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
