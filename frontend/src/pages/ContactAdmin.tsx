import { ChatInterface } from "@/components/ChatInterface";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAdmins } from "@/hooks/useAppQueries";
import { motion } from "framer-motion";
import { Headset, Search, UserCog } from "lucide-react";
import { useEffect, useState } from "react";

interface Admin {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    unread_count?: number;
    last_message_at?: string;
}

const ContactAdmin = () => {
    const { data: adminsList, isLoading } = useAdmins();
    const [filteredAdmins, setFilteredAdmins] = useState<Admin[]>([]);
    const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isExpanded, setIsExpanded] = useState(false);
    const studentId = sessionStorage.getItem("studentId");

    useEffect(() => {
        if (adminsList) {
            if (searchQuery.trim() === "") {
                setFilteredAdmins(adminsList);
            } else {
                const query = searchQuery.toLowerCase();
                setFilteredAdmins(adminsList.filter((a: Admin) =>
                    `${a.first_name} ${a.last_name}`.toLowerCase().includes(query) ||
                    a.email.toLowerCase().includes(query)
                ));
            }
        }
    }, [searchQuery, adminsList]);

    return (
        <motion.div
            className="min-h-screen bg-white dark:bg-slate-950 transition-colors duration-300"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
                duration: 0.4
            }}
        >
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none h-[400px]" />

            <div className="container p-6 h-[calc(100vh-100px)] relative pt-0 max-w-full ml-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full relative">
                    {/* Admin List */}
                    <Card className="col-span-1 flex flex-col h-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                        <CardHeader className="p-4 border-b">
                            <CardTitle className="text-lg mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                                <Headset className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                Support Team
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
                                                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-semibold">
                                                        <UserCog className="w-5 h-5" />
                                                    </div>
                                                    {admin.unread_count && admin.unread_count > 0 ? (
                                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                                                    ) : null}
                                                </div>
                                                <div className="overflow-hidden flex-1">
                                                    <div className="flex justify-between items-center">
                                                        <p className="font-medium truncate">{admin.first_name} {admin.last_name}</p>
                                                        {admin.last_message_at && (
                                                            <span className="text-[10px] text-muted-foreground">
                                                                {new Date(admin.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground truncate">{admin.role}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {isLoading ? (
                                        <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
                                            Loading support team...
                                        </div>
                                    ) : filteredAdmins.length === 0 ? (
                                        <div className="p-8 text-center text-muted-foreground">
                                            No admins found.
                                        </div>
                                    ) : null}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* Chat Area */}
                    <div className="col-span-1 md:col-span-2 h-full">
                        {selectedAdmin && studentId ? (
                            <div className="h-full">
                                <ChatInterface
                                    currentUserId={studentId}
                                    currentUserType="student"
                                    targetUserId={selectedAdmin.id}
                                    targetUserType="admin"
                                    targetUserName={`${selectedAdmin.first_name} ${selectedAdmin.last_name}`}
                                    onExpand={() => setIsExpanded(!isExpanded)}
                                    isExpanded={isExpanded}
                                />
                            </div>
                        ) : (
                            <Card className="h-full flex items-center justify-center text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 border-dashed border-slate-300 dark:border-slate-700">
                                <div className="text-center">
                                    <Headset className="w-12 h-12 mx-auto mb-4 opacity-50 text-emerald-600 dark:text-emerald-400" />
                                    <p>Select an admin to start a conversation</p>
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default ContactAdmin;
