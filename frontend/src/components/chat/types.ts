
export interface ChatUser {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
    status: 'online' | 'offline' | 'away';
    lastMessage?: string;
    lastMessageTime?: string;
    unreadCount: number;
    type?: 'student' | 'admin' | 'super_admin'; // Added to distinguish user types
}

export interface ChatMessage {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    createdAt: string;
    isRead: boolean;
}
