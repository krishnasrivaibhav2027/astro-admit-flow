import { ChatInterface } from "@/components/ChatInterface";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Headset, Search, UserCog } from "lucide-react";
import { useEffect, useState } from "react";

interface AdminContact {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    last_message_at?: string;
    unread_count?: number;
    institution_name?: string; // Optional if we can fetch it
    type: 'admin' | 'super_admin';
}

const SuperAdminContactAdmin = () => {
    const [admins, setAdmins] = useState<AdminContact[]>([]);
    const [filteredAdmins, setFilteredAdmins] = useState<AdminContact[]>([]);
    const [selectedAdmin, setSelectedAdmin] = useState<AdminContact | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);

    useEffect(() => {
        fetchCurrentAdmin();
        fetchAdmins();

        // Poll for updates every 30 seconds
        const interval = setInterval(fetchAdmins, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        filterAdmins();
    }, [searchQuery, admins]);

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

    const fetchAdmins = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const headers: HeadersInit = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            // Fetch Admins
            const adminsRes = await fetch(`${backendUrl}/api/chat/admins`, { headers });
            const adminsData = adminsRes.ok ? await adminsRes.json() : [];

            // Filter out self and other super admins - we only want Institution Admins here
            const formattedAdmins = adminsData
                .filter((a: any) => a.id !== currentAdminId && a.role !== 'super_admin')
                .map((a: any) => ({
                    ...a,
                    type: 'admin'
                }));

            setAdmins(formattedAdmins);

        } catch (error) {
            console.error("Failed to fetch admins:", error);
        }
    };

    const filterAdmins = () => {
        let result = [...admins];

        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase();
            result = result.filter(a =>
                `${a.first_name} ${a.last_name}`.toLowerCase().includes(query) ||
                a.email.toLowerCase().includes(query)
            );
        }

        // Sort by last_message_at desc
        result.sort((a, b) => {
            const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
            const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
            return timeB - timeA;
        });

        setFilteredAdmins(result);
    };

    return (
        <div className="container mx-auto p-6 h-[calc(100vh-100px)]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
                {/* Admin List */}
                <Card className="col-span-1 flex flex-col h-full">
                    <CardHeader className="p-4 border-b">
                        <CardTitle className="text-lg mb-4 flex items-center gap-2">
                            <UserCog className="w-5 h-5" />
                            Institution Admins
                        </CardTitle>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search admins..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="divide-y">
                                {filteredAdmins.map((admin) => (
                                    <div
                                        key={admin.id}
                                        className={`p-4 cursor-pointer hover:bg-accent/50 transition-colors ${selectedAdmin?.id === admin.id ? "bg-accent" : ""
                                            }`}
                                        onClick={() => setSelectedAdmin(admin)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 flex items-center justify-center font-semibold">
                                                    {admin.first_name.charAt(0)}
                                                </div>
                                                {admin.unread_count && admin.unread_count > 0 ? (
                                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                                                ) : null}
                                            </div>
                                            <div className="overflow-hidden flex-1">
                                                <div className="flex justify-between items-start">
                                                    <p className="font-medium truncate">{admin.first_name} {admin.last_name}</p>
                                                    {admin.last_message_at && (
                                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                                                            {new Date(admin.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                                                {admin.role && <p className="text-[10px] text-muted-foreground bg-gray-100 dark:bg-gray-800 w-fit px-1.5 py-0.5 rounded mt-1">{admin.role}</p>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {filteredAdmins.length === 0 && (
                                    <div className="p-8 text-center text-muted-foreground">
                                        No admins found.
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Chat Area */}
                <div className="col-span-1 md:col-span-2 h-full">
                    {selectedAdmin && currentAdminId ? (
                        <div className="h-full">
                            <ChatInterface
                                currentUserId={currentAdminId}
                                currentUserType="admin" // Super admin is technically an 'admin' type in chat
                                targetUserId={selectedAdmin.id}
                                targetUserType="admin"
                                targetUserName={`${selectedAdmin.first_name} ${selectedAdmin.last_name}`}
                            />
                        </div>
                    ) : (
                        <Card className="h-full flex items-center justify-center text-muted-foreground bg-muted/20 border-dashed">
                            <div className="text-center">
                                <Headset className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>Select an admin to start messaging</p>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SuperAdminContactAdmin;
