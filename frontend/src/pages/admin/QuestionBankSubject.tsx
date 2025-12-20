import { MathRenderer } from "@/components/MathRenderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, ChevronLeft, Layers, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

// Reuse Types
interface Question {
    id: string;
    question: string;
    answer: string;
    is_used: boolean;
    created_at: string;
}

const QuestionBankSubject = () => {
    const { subject } = useParams<{ subject: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [questions, setQuestions] = useState<Question[]>([]);
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [currentLevel, setCurrentLevel] = useState("medium");

    useEffect(() => {
        if (subject) {
            fetchQuestions(subject, currentLevel);
        }
    }, [subject, currentLevel]);

    const fetchQuestions = async (subj: string, lvl: string) => {
        setLoadingQuestions(true);
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const response = await fetch(`${backendUrl}/api/admin/question-bank/questions?subject=${subj}&level=${lvl}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setQuestions(await response.json());
            }
        } catch (error) {
            console.error("Fetch questions error:", error);
            toast({
                title: "Error",
                description: "Failed to fetch questions",
                variant: "destructive"
            });
        } finally {
            setLoadingQuestions(false);
        }
    };

    if (!subject) return <div>Invalid Subject</div>;

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/admin/question-bank")}>
                    <ChevronLeft className="w-6 h-6" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2 capitalize">
                        <BookOpen className="w-8 h-8 text-emerald-600" />
                        {subject} Question Bank
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Managing questions for {subject}
                    </p>
                </div>
            </div>

            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader>
                    <CardTitle className="capitalize flex items-center gap-2">
                        <Layers className="w-5 h-5" />
                        {subject} Questions
                    </CardTitle>
                    <CardDescription>
                        Review questions currently in the bank
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="medium" onValueChange={setCurrentLevel}>
                        <TabsList className="grid w-full grid-cols-3 max-w-[400px]">
                            <TabsTrigger value="easy">Easy</TabsTrigger>
                            <TabsTrigger value="medium">Medium</TabsTrigger>
                            <TabsTrigger value="hard">Hard</TabsTrigger>
                        </TabsList>

                        <div className="mt-4 space-y-4">
                            {loadingQuestions ? (
                                <div className="flex justify-center py-8">
                                    <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
                                </div>
                            ) : questions.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No questions found for this level.
                                    <br />
                                    <Link to="/admin/question-bank" className="text-emerald-500 hover:underline">
                                        Go back to generate some!
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                                    {questions.map((q) => (
                                        <div key={q.id} className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50 flex flex-col gap-2 relative group">
                                            <div className="flex justify-between items-start">
                                                <div className="font-medium text-sm pr-12">
                                                    <MathRenderer text={q.question} />
                                                </div>
                                                <Badge variant={q.is_used ? "destructive" : "outline"} className={!q.is_used ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""}>
                                                    {q.is_used ? "Used" : "Available"}
                                                </Badge>
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1 border-t pt-2">
                                                <span className="font-semibold">Answer: </span>
                                                <MathRenderer text={q.answer} />
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-1">
                                                ID: {q.id} • Created: {new Date(q.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
};

export default QuestionBankSubject;
