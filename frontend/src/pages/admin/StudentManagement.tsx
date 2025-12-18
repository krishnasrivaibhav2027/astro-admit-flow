import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import 'katex/dist/katex.min.css';
import { BookOpen, Calendar, Filter, Loader2, Search, UserCheck, Users } from "lucide-react";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Student {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    created_at: string;
}

const StudentManagement = () => {
    const navigate = useNavigate();
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const { toast } = useToast();

    // Removed Dialog State Logic
    const [loadingQuestions, setLoadingQuestions] = useState(false);

    // Removed handleViewQuestions function


    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            const token = localStorage.getItem("firebase_token");
            const backendUrl = import.meta.env.VITE_BACKEND_URL;

            const response = await fetch(`${backendUrl}/api/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error("Failed to fetch students");

            const data = await response.json();
            // Filter out admins as requested
            setStudents(data.filter((user: Student) => user.role !== 'admin'));
        } catch (error) {
            console.error("Error:", error);
            toast({
                title: "Error",
                description: "Failed to load students",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = students.filter(student =>
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.last_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Stats Calculation
    const totalStudents = students.length;
    const activeStudents = students.length; // Assuming all fetched non-admins are active for now, or we could filter by some status if available
    const recentJoins = students.filter(s => {
        const joinDate = new Date(s.created_at);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return joinDate > sevenDaysAgo;
    }).length;

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Student Management</h1>
                <p className="text-muted-foreground">Manage and monitor all student accounts</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                <Users className="h-5 w-5" />
                            </div>
                            <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">
                                +12%
                            </Badge>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                            <h2 className="text-3xl font-bold">{totalStudents}</h2>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                <UserCheck className="h-5 w-5" />
                            </div>
                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">
                                +8%
                            </Badge>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Active Students</p>
                            <h2 className="text-3xl font-bold">{activeStudents}</h2>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                                <Calendar className="h-5 w-5" />
                            </div>
                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20">
                                +3
                            </Badge>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Recent Joins</p>
                            <h2 className="text-3xl font-bold">{recentJoins}</h2>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/50 p-4 rounded-xl border border-border/50">
                <div className="relative flex-1 w-full md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search students by name or email..."
                        className="pl-10 bg-background/50 border-border/50"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <Button variant="outline" className="bg-emerald-500 text-white border-emerald-500 hover:bg-white hover:text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500 dark:border-emerald-500/20 dark:hover:bg-white dark:hover:text-emerald-500">
                        <Filter className="mr-2 h-4 w-4" />
                        Filter
                    </Button>

                </div>
            </div>

            {/* Students Table */}
            <Card className="bg-card/50 border-border/50 overflow-hidden">
                <div className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow className="hover:bg-transparent border-border/50">
                                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pl-6">Name</TableHead>
                                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</TableHead>
                                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role</TableHead>
                                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Joined</TableHead>
                                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right pr-6">Questions</TableHead>
                            </TableRow>

                        </TableHeader>
                        <TableBody>
                            {filteredStudents.map((student) => (
                                <TableRow key={student.id} className="hover:bg-muted/50 border-border/50 transition-colors">
                                    <TableCell className="pl-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20">
                                                {(student.first_name || '?').charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground">
                                                    {student.first_name || 'Unknown'} {student.last_name || ''}
                                                </p>
                                                <p className="text-xs text-muted-foreground">ID: {student.id.slice(0, 8)}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            {student.email}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20">
                                            <UserCheck className="w-3 h-3 mr-1" />
                                            {student.role || 'Student'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 opacity-50" />
                                            {student.created_at ? new Date(student.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) : 'N/A'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Button variant="outline" size="sm" onClick={() => navigate(`/admin/students/${student.id}/questions`)}>
                                            <BookOpen className="w-4 h-4 mr-2" />
                                            Questions
                                        </Button>
                                    </TableCell>
                                </TableRow>

                            ))}
                            {filteredStudents.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                                        No students found matching your criteria.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>


        </div>

    );
};

export default StudentManagement;
