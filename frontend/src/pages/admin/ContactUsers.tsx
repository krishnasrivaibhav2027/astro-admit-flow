import { ChatInterface } from "@/components/ChatInterface";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Headset, Search, User, UserCog } from "lucide-react";
import { useEffect, useState } from "react";

interface UserContact {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string; // 'student' or 'admin' or 'super_admin'
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
    const [activeTab, setActiveTab] = useState("all");

    useEffect(() => {
        fetchCurrentAdmin();
        fetchAllUsers();

        // Poll for updates every 30 seconds
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

            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await fetch(`${backendUrl}/api/admin/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setCurrentAdminId(data.id);
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

            // Fetch Students
            const studentsRes = await fetch(`${backendUrl}/api/chat/students`, { headers });
            const studentsData = studentsRes.ok ? await studentsRes.json() : [];

            // Fetch Admins
            const adminsRes = await fetch(`${backendUrl}/api/chat/admins`, { headers });
            const adminsData = adminsRes.ok ? await adminsRes.json() : [];

            const formattedStudents = studentsData.map((s: any) => ({
                ...s,
                type: 'student',
                role: 'Student'
            }));

            const formattedAdmins = adminsData
                .filter((a: any) => a.id !== currentAdminId) // Exclude self if possible, though ID match check is better
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

        // Tab Filter
        if (activeTab === 'students') {
            result = result.filter(u => u.type === 'student');
        } else if (activeTab === 'admins') {
            result = result.filter(u => u.type === 'admin');
        }

        // Search Filter
        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase();
            result = result.filter(u =>
                `${u.first_name} ${u.last_name}`.toLowerCase().includes(query) ||
                u.email.toLowerCase().includes(query)
            );
        }

        // Sort by last_message_at desc
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
        <div className="container mx-auto p-6 h-[calc(100vh-100px)]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
                {/* User List */}
                <Card className="col-span-1 flex flex-col h-full">
                    <CardHeader className="p-4 border-b space-y-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Messages</CardTitle>
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                                <TabsList className="grid w-full grid-cols-3 h-8">
                                    <TabsTrigger value="all" className="text-xs px-2">All</TabsTrigger>
                                    <TabsTrigger value="students" className="text-xs px-2">Students</TabsTrigger>
                                    <TabsTrigger value="admins" className="text-xs px-2">Admins</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search users..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="divide-y">
                                {filteredUsers.map((user) => (
                                    <div
                                        key={user.id}
                                        className={`p-4 cursor-pointer hover:bg-accent/50 transition-colors ${selectedUser?.id === user.id ? "bg-accent" : ""
                                            }`}
                                        onClick={() => setSelectedUser(user)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold
                                                    ${user.type === 'admin'
                                                        ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                                                        : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                    }`}
                                                >
                                                    {user.first_name.charAt(0)}
                                                </div>
                                                {user.unread_count && user.unread_count > 0 ? (
                                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                                                ) : null}
                                            </div>
                                            <div className="overflow-hidden flex-1">
                                                <div className="flex justify-between items-start">
                                                    <p className="font-medium truncate">{user.first_name} {user.last_name}</p>
                                                    {user.last_message_at && (
                                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                                                            {new Date(user.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    {getUserIcon(user)}
                                                    <span className="truncate">{user.role}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <div className="p-8 text-center text-muted-foreground">
                                        No users found.
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Chat Area */}
                <div className="col-span-1 md:col-span-2 h-full">
                    {selectedUser && currentAdminId ? (
                        <div className="h-full">
                            <ChatInterface
                                currentUserId={currentAdminId}
                                currentUserType="admin"
                                targetUserId={selectedUser.id}
                                targetUserType={selectedUser.type} // Dynamic type
                                targetUserName={`${selectedUser.first_name} ${selectedUser.last_name}`}
                            />
                        </div>
                    ) : (
                        <Card className="h-full flex items-center justify-center text-muted-foreground bg-muted/20 border-dashed">
                            <div className="text-center">
                                <Headset className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>Select a user to start messaging</p>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContactUsers;
