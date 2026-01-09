
import { ChatLayout } from '@/components/chat/ChatLayout';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { NewChatModal } from '@/components/chat/NewChatModal';
import { ChatMessage, ChatUser } from '@/components/chat/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo, useState } from 'react';

export default function StudentMessages() {
    const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);
    const [institutionId, setInstitutionId] = useState<string | null>(null);

    const [users, setUsers] = useState<ChatUser[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'archived'>('all');
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);

    const { toast } = useToast();

    // 1. Initialize Student
    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                // Get student profile to find institution
                const { data: profile } = await supabase
                    .from('students')
                    .select('id, institution_id')
                    .eq('email', session.user.email) // Link via email usually, or if id matches
                    .single();

                if (profile) {
                    setCurrentStudentId(profile.id); // Note: Student ID might differ from Auth ID depending on schema!
                    // Wait, usually Student ID in 'students' table IS the Auth ID if designed that way.
                    // But messages table 'sender_id' expectation depends on what ID we use.
                    // Schema 023 says sender_id TEXT.
                    // Let's assume for now we use the ID from the 'students' table as the canonical ID for 'sender_id'.
                    // If 'students.id' is UUID and matches auth.uid(), perfect.

                    setInstitutionId(profile.institution_id);
                    fetchContacts(profile.institution_id);
                }
            }
        };
        init();
    }, []);

    // 2. Fetch Contacts (Admins)
    const fetchContacts = async (instId: string) => {
        // Fetch admins for this institution
        const { data: admins, error } = await supabase
            .from('institution_admins')
            .select('id, name, email')
            .eq('institution_id', instId);

        if (error) {
            console.error('Error fetching admins:', error);
            return;
        }

        if (admins) {
            const chatUsers: ChatUser[] = admins.map((a: any) => ({
                id: a.id,
                name: a.name || a.email,
                email: a.email,
                status: 'offline',
                unreadCount: 0,
                lastMessage: '',
                lastMessageTime: ''
            }));
            setUsers(chatUsers);
        }
    };

    // 3. Fetch Messages
    useEffect(() => {
        if (!currentStudentId) return;

        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .or(`sender_id.eq.${currentStudentId},receiver_id.eq.${currentStudentId}`)
                .order('created_at', { ascending: true });

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

        const channel = supabase
            .channel('student-messages')
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentStudentId}` },
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
                        description: `From Admin: ${parsed.content.substring(0, 30)}...`,
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentStudentId]);

    // 4. Transform Users
    const enrichedUsers = useMemo(() => {
        const userMap = new Map<string, ChatUser>(users.map(u => [u.id, { ...u }]));

        messages.forEach(msg => {
            const otherPartyId = msg.senderId === currentStudentId ? msg.receiverId : msg.senderId;
            const user = userMap.get(otherPartyId);
            if (user) {
                user.lastMessage = msg.content;
                user.lastMessageTime = new Date(msg.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });

                if (msg.receiverId === currentStudentId && !msg.isRead) {
                    user.unreadCount = (user.unreadCount || 0) + 1;
                }
            }
        });

        let result = Array.from(userMap.values());

        return result.sort((a, b) => {
            if (a.lastMessage && !b.lastMessage) return -1;
            if (!a.lastMessage && b.lastMessage) return 1;
            return 0;
        });
    }, [users, messages, currentStudentId]);

    const displayUsers = useMemo(() => {
        if (activeTab === 'unread') return enrichedUsers.filter(u => u.unreadCount > 0);
        if (activeTab === 'archived') return [];
        return enrichedUsers;
    }, [enrichedUsers, activeTab]);

    // 5. Handlers
    const handleSendMessage = async (content: string) => {
        if (!currentStudentId || !selectedUserId) return;

        const tempId = crypto.randomUUID();
        const newMsg: ChatMessage = {
            id: tempId,
            senderId: currentStudentId,
            receiverId: selectedUserId,
            content: content,
            createdAt: new Date().toISOString(),
            isRead: false
        };
        setMessages(prev => [...prev, newMsg]);

        const { error } = await supabase.from('messages').insert({
            sender_id: currentStudentId,
            sender_type: 'student',
            receiver_id: selectedUserId,
            receiver_type: 'admin',
            content: content
        });

        if (error) {
            console.error("Send failed", error);
            toast({ title: "Failed to send", variant: "destructive" });
        }
    };

    const currentConversation = useMemo(() => {
        if (!selectedUserId) return [];
        return messages.filter(m =>
            (m.senderId === currentStudentId && m.receiverId === selectedUserId) ||
            (m.receiverId === currentStudentId && m.senderId === selectedUserId)
        );
    }, [messages, selectedUserId, currentStudentId]);

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
                    title="Mentor Chat"
                />
            }
        >
            <ChatWindow
                selectedUser={selectedUserData}
                messages={currentConversation}
                onSendMessage={handleSendMessage}
                currentUserId={currentStudentId || ''}
                isLoading={isLoadingMessages}
            />

            <NewChatModal
                isOpen={isNewChatOpen}
                onClose={() => setIsNewChatOpen(false)}
                users={users}
                onSelectUser={(id) => {
                    setSelectedUserId(id);
                    setIsNewChatOpen(false);
                }}
            />
        </ChatLayout>
    );
}
