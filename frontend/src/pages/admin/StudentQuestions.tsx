import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import 'katex/dist/katex.min.css';
import { ArrowLeft, BookOpen, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { InlineMath } from "react-katex";
import { useNavigate, useParams } from "react-router-dom";

const StudentQuestions = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState<any[]>([]);
    const [studentName, setStudentName] = useState("");

    useEffect(() => {
        if (studentId) {
            fetchData();
        }
    }, [studentId]);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem("firebase_token");
            const backendUrl = import.meta.env.VITE_BACKEND_URL;

            // Fetch student details for name
            const userRes = await fetch(`${backendUrl}/api/admin/student/${studentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (userRes.ok) {
                const userData = await userRes.json();
                setStudentName(`${userData.first_name} ${userData.last_name}`);
            }

            // Fetch Questions
            const res = await fetch(`${backendUrl}/api/admin/student/${studentId}/questions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setQuestions(data);
            }

            // Try to fetch student name from list if single endpoint doesn't exist or just use ID
            // Ideally we should have a `get_student` admin endpoint. 
            // Checking server.py, there is `get_student` (line 281) but it might be protected for self only?
            // `get_student` uses `get_current_user` and checks `id`. 
            // Admin usually accesses via `list_users`.
            // Let's rely on questions for now or fetch list and find.
            // Optimization: Just show ID or fetch list.
            const listRes = await fetch(`${backendUrl}/api/admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (listRes.ok) {
                const users = await listRes.json();
                const student = users.find((u: any) => u.id === studentId);
                if (student) {
                    setStudentName(`${student.first_name} ${student.last_name}`);
                }
            }

        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Failed to fetch data", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="animate-spin w-8 h-8 text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 animate-fade-in space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate("/admin/students")}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Students
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Assigned Questions</h1>
                    <p className="text-muted-foreground">
                        Reviewing history for {studentName || studentId}
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent>
                    {questions.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            No questions recorded for this student via Question Bank.
                        </div>
                    ) : (
                        <Tabs defaultValue="physics" className="w-full">
                            <TabsList className="grid w-full grid-cols-3 mb-8">
                                <TabsTrigger value="physics">Physics</TabsTrigger>
                                <TabsTrigger value="math">Mathematics</TabsTrigger>
                                <TabsTrigger value="chemistry">Chemistry</TabsTrigger>
                            </TabsList>

                            {["physics", "math", "chemistry"].map((subject) => {
                                const subjectQuestions = questions.filter(
                                    q => (q.subject || '').toLowerCase() === subject
                                );

                                return (
                                    <TabsContent key={subject} value={subject} className="space-y-4">
                                        {subjectQuestions.length > 0 ? (
                                            subjectQuestions.map((q, idx) => (
                                                <div key={idx} className="p-6 border rounded-xl bg-slate-50 dark:bg-slate-900/50 hover:shadow-md transition-shadow">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex gap-2">
                                                            <Badge variant="secondary" className="capitalize px-3 py-1">{q.level}</Badge>
                                                        </div>
                                                        <Badge variant={q.status === 'Attempted' ? 'default' : 'secondary'} className={`px-3 py-1 ${q.status === 'Attempted' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-500 text-white hover:bg-slate-600'}`}>
                                                            {q.status || 'Unknown'}
                                                        </Badge>
                                                    </div>

                                                    <div className="mb-6">
                                                        <h4 className="text-sm font-semibold text-muted-foreground mb-2">Question</h4>
                                                        <div className="text-lg font-medium p-4 bg-white dark:bg-slate-950 rounded-lg border">
                                                            {q.question ? (
                                                                // Simple parser to handle mixed text and LaTeX
                                                                <span>
                                                                    {q.question.split(/(\$[^\$]+\$)/g).map((part: string, i: number) => {
                                                                        if (part.startsWith('$') && part.endsWith('$')) {
                                                                            return <InlineMath key={i} math={part.slice(1, -1)} />;
                                                                        }
                                                                        return <span key={i}>{part}</span>;
                                                                    })}
                                                                </span>
                                                            ) : (
                                                                <span className="italic text-muted-foreground">No question text available</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed rounded-xl bg-slate-50/50">
                                                <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                                                    <BookOpen className="w-8 h-8 opacity-50" />
                                                </div>
                                                <p>No {subject} questions found.</p>
                                            </div>
                                        )}
                                    </TabsContent>
                                );
                            })}
                        </Tabs>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default StudentQuestions;
