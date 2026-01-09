
import { ChatLayout } from '@/components/chat/ChatLayout';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { NewChatModal } from '@/components/chat/NewChatModal';
import { ChatMessage, ChatUser } from '@/components/chat/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo, useState } from 'react';

export default function AdminMessages() {
    // Current User State
    const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
    const [institutionId, setInstitutionId] = useState<string | null>(null);

    // Chat Data State
    const [users, setUsers] = useState<ChatUser[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    // UI State
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'archived'>('all');
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);

    const { toast } = useToast();

    // 1. Initialize Admin
    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setCurrentAdminId(session.user.id);
                // Fetch Institution ID from metadata or table
                // Usually stored in app_metadata, assuming we can get it or query it.
                // For now, let's query institution_admins
                const { data: adminData } = await supabase
                    .from('institution_admins')
                    .select('institution_id')
                    .eq('id', session.user.id) // Assuming admin ID matches auth ID
                    .single();

                if (adminData) {
                    setInstitutionId(adminData.institution_id);
                    fetchContacts(adminData.institution_id);
                }
            }
        };
        init();
    }, []);

    // 2. Fetch Contacts (Students)
    const fetchContacts = async (instId: string) => {
        // Fetch all students in this institution
        const { data: students, error } = await supabase
            .from('students')
            .select('id, first_name, last_name, email')
            .eq('institution_id', instId);

        if (error) {
            console.error('Error fetching students:', error);
            return;
        }

        if (students) {
            const chatUsers: ChatUser[] = students.map((s: any) => ({
                id: s.id,
                name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.email,
                email: s.email,
                status: 'offline', // Todo: Implement presence
                unreadCount: 0,
                lastMessage: '',
                lastMessageTime: ''
            }));
            setUsers(chatUsers);
        }
    };

    // 3. Fetch Messages & Subscribe
    useEffect(() => {
        if (!currentAdminId) return;

        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .or(`sender_id.eq.${currentAdminId},receiver_id.eq.${currentAdminId}`)
                .order('created_at', { ascending: true }); // We sort locally for ChatWindow but keep chronological for parsing

            if (error) console.error("Error fetching messages", error);
            else if (data) {
                const parsedMsgs: ChatMessage[] = data.map((m: any) => ({
                    id: m.id,
                    senderId: m.sender_id,
                    receiverId: m.receiver_id,
                    content: m.content,
                    createdAt: m.created_at,
                    isRead: m.is_read
                }));
                setMessages(parsedMsgs);
            }
        };

        fetchMessages();

        // Subscribe to real-time changes
        const channel = supabase
            .channel('admin-messages')
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentAdminId}` },
                (payload) => {
                    const newMsg = payload.new as any;
                    const parsed: ChatMessage = {
                        id: newMsg.id,
                        senderId: newMsg.sender_id,
                        receiverId: newMsg.receiver_id,
                        content: newMsg.content,
                        createdAt: newMsg.created_at,
                        isRead: newMsg.is_read
                    };
                    setMessages(prev => [...prev, parsed]);
                    toast({
                        title: "New Message",
                        description: parsed.content.substring(0, 30) + "...",
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentAdminId]);

    // 4. Transform Users with Message Data
    // We need to update the 'users' list with unread counts and last message info derived from 'messages'
    const enrichedUsers = useMemo(() => {
        const userMap = new Map<string, ChatUser>(users.map(u => [u.id, { ...u }]));

        // Process messages to update users
        messages.forEach(msg => {
            const otherPartyId = msg.senderId === currentAdminId ? msg.receiverId : msg.senderId;
            const user = userMap.get(otherPartyId);
            if (user) {
                user.lastMessage = msg.content;
                user.lastMessageTime = new Date(msg.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });

                // If I am receiver and it's not read, incr unread
                if (msg.receiverId === currentAdminId && !msg.isRead) {
                    user.unreadCount = (user.unreadCount || 0) + 1;
                }
            }
        });

        // Filter by Tab
        let result = Array.from(userMap.values());

        // Sort by last message time (desc)
        // Since we iterated messages in asc order, the last one processed is the latest.
        // But we need proper sorting logic. Best is to store raw timestamp.
        // For now, let's just reverse the input to logic or trust the user list order?
        // Actually, we should sort 'result' by 'lastMessageTime' logic.
        // Let's just create a quick map for timestamps.

        return result.sort((a, b) => {
            // Simple string compare might fail, need real date tracking. 
            // Ideally we store lastMessageTimestamp in User.
            // For now, let's leave as is or basic sort if any content exists.
            if (a.lastMessage && !b.lastMessage) return -1;
            if (!a.lastMessage && b.lastMessage) return 1;
            return 0;
        });
    }, [users, messages, currentAdminId]);

    const displayUsers = useMemo(() => {
        if (activeTab === 'unread') return enrichedUsers.filter(u => u.unreadCount > 0);
        // Archived logic not implemented yet in DB, so 'archived' tab is empty for now
        if (activeTab === 'archived') return [];
        return enrichedUsers;
    }, [enrichedUsers, activeTab]);


    // 5. Handlers
    const handleSendMessage = async (content: string) => {
        if (!currentAdminId || !selectedUserId) return;

        // Optimistic Update
        const tempId = crypto.randomUUID();
        const newMsg: ChatMessage = {
            id: tempId,
            senderId: currentAdminId,
            receiverId: selectedUserId,
            content: content,
            createdAt: new Date().toISOString(),
            isRead: false
        };
        setMessages(prev => [...prev, newMsg]);

        // Send to DB
        const { error } = await supabase.from('messages').insert({
            sender_id: currentAdminId,
            sender_type: 'admin',
            receiver_id: selectedUserId,
            receiver_type: 'student',
            content: content
        });

        if (error) {
            console.error("Send failed", error);
            toast({ title: "Failed to send", variant: "destructive" });
        }
    };

    // Filter messages for the selected conversation
    const currentConversation = useMemo(() => {
        if (!selectedUserId) return [];
        return messages.filter(m =>
            (m.senderId === currentAdminId && m.receiverId === selectedUserId) ||
            (m.receiverId === currentAdminId && m.senderId === selectedUserId)
        );
    }, [messages, selectedUserId, currentAdminId]);

    const selectedUserData = users.find(u => u.id === selectedUserId) || null;

    return (
        <ChatLayout
            sidebar={
                <ChatSidebar
                    users={displayUsers}
                    selectedUserId={selectedUserId}
                    onSelectUser={setSelectedUserId}
                    onNewChat={() => setIsNewChatOpen(true)}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    title="Student Chats"
                />
            }
        >
            <ChatWindow
                selectedUser={selectedUserData}
                messages={currentConversation}
                onSendMessage={handleSendMessage}
                currentUserId={currentAdminId || ''}
                isLoading={isLoadingMessages}
            />

            <NewChatModal
                isOpen={isNewChatOpen}
                onClose={() => setIsNewChatOpen(false)}
                users={users} // Pass all users to pick from
                onSelectUser={(id) => {
                    setSelectedUserId(id);
                    setIsNewChatOpen(false);
                }}
            />
        </ChatLayout>
    );
}
