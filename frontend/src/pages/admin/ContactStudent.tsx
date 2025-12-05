import { ChatInterface } from "@/components/ChatInterface";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, User } from "lucide-react";
import { useEffect, useState } from "react";

interface Student {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    last_message_at?: string;
    unread_count?: number;
}

const ContactStudent = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [adminId, setAdminId] = useState<string | null>(null);

    useEffect(() => {
        fetchStudents();
        fetchCurrentAdmin();

        // Poll for updates every 30 seconds
        const interval = setInterval(fetchStudents, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        let result = [...students];

        // Filter
        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase();
            result = result.filter(s =>
                `${s.first_name} ${s.last_name}`.toLowerCase().includes(query) ||
                s.email.toLowerCase().includes(query)
            );
        }

        // Sort by last_message_at desc
        result.sort((a, b) => {
            const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
            const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
            return timeB - timeA;
        });

        setFilteredStudents(result);
    }, [searchQuery, students]);

    const fetchCurrentAdmin = async () => {
        try {
            const token = localStorage.getItem("firebase_token");
            if (!token) return;

            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await fetch(`${backendUrl}/api/admin/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setAdminId(data.id);
            }
        } catch (error) {
            console.error("Failed to fetch admin info", error);
        }
    };

    const fetchStudents = async () => {
        try {
            const token = localStorage.getItem("firebase_token");
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const headers: HeadersInit = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${backendUrl}/api/chat/students`, {
                headers
            });
            if (response.ok) {
                const data = await response.json();
                setStudents(data);
            }
        } catch (error) {
            console.error("Failed to fetch students:", error);
        }
    };

    return (
        <div className="container mx-auto p-6 h-[calc(100vh-100px)]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
                {/* Student List */}
                <Card className="col-span-1 flex flex-col h-full">
                    <CardHeader className="p-4 border-b">
                        <CardTitle className="text-lg mb-4">Students</CardTitle>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search students..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="divide-y">
                                {filteredStudents.map((student) => (
                                    <div
                                        key={student.id}
                                        className={`p-4 cursor-pointer hover:bg-accent/50 transition-colors ${selectedStudent?.id === student.id ? "bg-accent" : ""
                                            }`}
                                        onClick={() => setSelectedStudent(student)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                                                    {student.first_name.charAt(0)}
                                                </div>
                                                {student.unread_count && student.unread_count > 0 ? (
                                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                                                ) : null}
                                            </div>
                                            <div className="overflow-hidden flex-1">
                                                <div className="flex justify-between items-start">
                                                    <p className="font-medium truncate">{student.first_name} {student.last_name}</p>
                                                    {student.last_message_at && (
                                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                                                            {new Date(student.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {filteredStudents.length === 0 && (
                                    <div className="p-8 text-center text-muted-foreground">
                                        No students found.
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Chat Area */}
                <div className="col-span-1 md:col-span-2 h-full">
                    {selectedStudent && adminId ? (
                        <div className="h-full">
                            <ChatInterface
                                currentUserId={adminId}
                                currentUserType="admin"
                                targetUserId={selectedStudent.id}
                                targetUserType="student"
                                targetUserName={`${selectedStudent.first_name} ${selectedStudent.last_name}`}
                            />
                        </div>
                    ) : (
                        <Card className="h-full flex items-center justify-center text-muted-foreground bg-muted/20 border-dashed">
                            <div className="text-center">
                                <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>Select a student to start messaging</p>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContactStudent;
