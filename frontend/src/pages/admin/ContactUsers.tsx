import { ChatInterface } from "@/components/ChatInterface";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Search, User, UserCog } from "lucide-react";
import { useEffect, useState } from "react";

interface UserContact {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    last_message_at?: string;
    unread_count?: number;
    type: 'student' | 'admin';
}

const ContactUsers = () => {
    const [users, setUsers] = useState<UserContact[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<UserContact[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserContact | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
    const [currentAdminEmail, setCurrentAdminEmail] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("recents");

    useEffect(() => {
        const init = async () => {
            await fetchCurrentAdmin();
            fetchAllUsers();
        };
        init();

        const interval = setInterval(fetchAllUsers, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        filterUsers();
    }, [searchQuery, users, activeTab]);

    const fetchCurrentAdmin = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) return;

            if (session?.user?.email) {
                setCurrentAdminEmail(session.user.email);
            }

            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await fetch(`${backendUrl}/api/admin/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setCurrentAdminId(data.id);
                if (data.email) {
                    setCurrentAdminEmail(data.email);
                }
            }
        } catch (error) {
            console.error("Failed to fetch admin info", error);
        }
    };

    const fetchAllUsers = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const headers: HeadersInit = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const studentsRes = await fetch(`${backendUrl}/api/chat/students`, { headers });
            const studentsData = studentsRes.ok ? await studentsRes.json() : [];

            const adminsRes = await fetch(`${backendUrl}/api/chat/admins`, { headers });
            const adminsData = adminsRes.ok ? await adminsRes.json() : [];

            const formattedStudents = studentsData.map((s: any) => ({
                ...s,
                type: 'student',
                role: 'Student'
            }));

            const formattedAdmins = adminsData
                .filter((a: any) => {
                    if (currentAdminId && a.id === currentAdminId) return false;
                    if (currentAdminEmail && a.email === currentAdminEmail) return false;
                    return true;
                })
                .map((a: any) => ({
                    ...a,
                    type: 'admin',
                    role: a.role || 'Admin'
                }));

            const allUsers = [...formattedStudents, ...formattedAdmins];
            setUsers(allUsers);

        } catch (error) {
            console.error("Failed to fetch users:", error);
        }
    };

    const filterUsers = () => {
        let result = [...users];

        if (activeTab === 'recents') {
            result = result.filter(u => u.last_message_at);
        } else if (activeTab === 'students') {
            result = result.filter(u => u.type === 'student');
        } else if (activeTab === 'admins') {
            result = result.filter(u => u.type === 'admin');
        }

        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase();
            result = result.filter(u =>
                `${u.first_name} ${u.last_name}`.toLowerCase().includes(query) ||
                u.email.toLowerCase().includes(query)
            );
        }

        result.sort((a, b) => {
            const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
            const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
            return timeB - timeA;
        });

        setFilteredUsers(result);
    };

    const getUserIcon = (user: UserContact) => {
        if (user.type === 'admin') return <UserCog className="w-5 h-5" />;
        return <User className="w-5 h-5" />;
    };

    return (
        <div className="h-[calc(100vh-88px)] w-[calc(100%+4rem)] -m-8 overflow-hidden">
            <div className="h-full w-full bg-white dark:bg-slate-900 overflow-hidden flex">
                {/* Left Sidebar - Contacts */}
                <div className="w-[360px] min-w-[320px] border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-slate-900/50 overflow-hidden">
                    {/* Header */}
                    <div className="p-5 border-b border-slate-200 dark:border-slate-700/50 space-y-4 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <MessageCircle className="w-5 h-5 text-emerald-500" />
                                Messages
                            </h2>
                        </div>

                        {/* Tabs */}
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-3 h-9 bg-slate-200/50 dark:bg-slate-800/50">
                                <TabsTrigger
                                    value="recents"
                                    className="text-xs font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400"
                                >
                                    Recents
                                </TabsTrigger>
                                <TabsTrigger
                                    value="students"
                                    className="text-xs font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400"
                                >
                                    Students
                                </TabsTrigger>
                                <TabsTrigger
                                    value="admins"
                                    className="text-xs font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400"
                                >
                                    Admins
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search conversations..."
                                className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-emerald-500 focus:border-emerald-500"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Contacts List */}
                    <ScrollArea className="flex-1 min-h-0">
                        <div className="py-2">
                            {filteredUsers.map((user) => (
                                <div
                                    key={user.id}
                                    className={`mx-2 mb-1 p-3 rounded-xl cursor-pointer transition-all duration-200 ${selectedUser?.id === user.id
                                        ? "bg-emerald-500/10 border border-emerald-500/30"
                                        : "hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-transparent"
                                        }`}
                                    onClick={() => setSelectedUser(user)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-lg ${user.type === 'admin'
                                                ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white'
                                                : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                                                }`}>
                                                {user.first_name.charAt(0)}
                                            </div>
                                            {user.unread_count && user.unread_count > 0 ? (
                                                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] text-white font-bold">
                                                    {user.unread_count > 9 ? '9+' : user.unread_count}
                                                </span>
                                            ) : null}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-0.5">
                                                <p className="font-semibold text-slate-900 dark:text-white truncate">
                                                    {user.first_name} {user.last_name}
                                                </p>
                                                {user.last_message_at && (
                                                    <span className="text-[11px] text-slate-400 flex-shrink-0 ml-2">
                                                        {new Date(user.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                                {getUserIcon(user)}
                                                <span className="truncate">{user.role}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {filteredUsers.length === 0 && (
                                <div className="p-8 text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                        <MessageCircle className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                                        {activeTab === 'recents' ? 'No recent conversations' : 'No users found'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* Right Side - Chat Area */}
                <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 overflow-hidden">
                    {selectedUser && currentAdminId ? (
                        <ChatInterface
                            currentUserId={currentAdminId}
                            currentUserType="admin"
                            targetUserId={selectedUser.id}
                            targetUserType={selectedUser.type}
                            targetUserName={`${selectedUser.first_name} ${selectedUser.last_name}`}
                            embedded={true}
                        />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8">
                            <div className="text-center max-w-md">
                                {/* Decorative Icon */}
                                <div className="relative mb-8">
                                    <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center">
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                                            <MessageCircle className="w-8 h-8 text-emerald-500" />
                                        </div>
                                    </div>
                                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-purple-500/10 animate-pulse" />
                                    <div className="absolute -bottom-1 -left-3 w-6 h-6 rounded-full bg-blue-500/10 animate-pulse delay-100" />
                                </div>

                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                                    Start a Conversation
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Select a contact from the list to begin messaging. Stay connected with your students and fellow administrators.
                                </p>

                                {/* Tips */}
                                <div className="mt-8 grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-left">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-2">
                                            <User className="w-4 h-4 text-emerald-500" />
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">Students</p>
                                        <p className="text-[11px] text-slate-400">Message your students directly</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-left">
                                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center mb-2">
                                            <UserCog className="w-4 h-4 text-purple-500" />
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">Admins</p>
                                        <p className="text-[11px] text-slate-400">Collaborate with other admins</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContactUsers;
