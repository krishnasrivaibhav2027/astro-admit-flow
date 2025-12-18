import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import "katex/dist/katex.min.css";
import { BookOpen, Database, Plus, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// Types
interface SubjectStats {
    unused: number;
    used: number;
    attempted: number;
}
interface BankStats {
    [subject: string]: {
        [level: string]: SubjectStats
    }
}


const QuestionBank = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [stats, setStats] = useState<BankStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [extracting, setExtracting] = useState(false);

    // Generation Form State
    const [genSubject, setGenSubject] = useState("physics");
    const [genLevel, setGenLevel] = useState("medium");
    const [genCount, setGenCount] = useState(5);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const token = localStorage.getItem("firebase_token");
            const response = await fetch(`${backendUrl}/api/admin/question-bank/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setStats(await response.json());
            }
        } catch (error) {
            console.error("Stats error:", error);
        } finally {
            setLoadingStats(false);
        }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const token = localStorage.getItem("firebase_token");
            const response = await fetch(`${backendUrl}/api/admin/question-bank/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    subject: genSubject,
                    level: genLevel,
                    num_questions: genCount
                })
            });

            if (response.ok) {
                const data = await response.json();
                toast({
                    title: "Generation Complete",
                    description: `Successfully added ${data.count} questions to the bank.`,
                    className: "bg-emerald-500 text-white border-none"
                });
                fetchStats(); // Refresh stats
            } else {
                throw new Error("Generation failed");
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to generate questions. Check logs.",
                variant: "destructive"
            });
        } finally {
            setGenerating(false);
        }
    };

    const handleExtractTopics = async () => {
        setExtracting(true);
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const token = localStorage.getItem("firebase_token");
            const response = await fetch(`${backendUrl}/api/admin/question-bank/extract-topics`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                toast({
                    title: "Topics Extracted",
                    description: `Updated topics from PDFs. Physics: ${data.stats.physics}, Math: ${data.stats.math}, Chem: ${data.stats.chemistry}`,
                    className: "bg-emerald-500 text-white border-none"
                });
            } else {
                throw new Error("Extraction failed");
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to extract topics. Ensure PDFs are present.",
                variant: "destructive"
            });
        } finally {
            setExtracting(false);
        }
    };

    const handleCardClick = (subject: string) => {
        navigate(`/admin/question-bank/${subject}`);
    };



    const getSubjectTotal = (subject: string) => {
        if (!stats || !stats[subject]) return 0;
        let total = 0;
        Object.values(stats[subject]).forEach(s => total += s.unused);
        return total;
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Database className="w-8 h-8 text-emerald-600" />
                        Question Bank
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-2">
                        Pre-generate and manage questions to reduce test latency
                    </p>
                </div>
                <Button onClick={fetchStats} variant="outline" size="sm" className="gap-2">
                    <RefreshCw className="w-4 h-4" /> Refresh Stats
                </Button>
            </div>

            {/* Generation Panel */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-r from-emerald-50 to-transparent dark:from-emerald-950/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                        <Plus className="w-5 h-5" />
                        Generate New Questions
                    </CardTitle>
                    <CardDescription>
                        Bulk generate questions using AI and add them to the bank
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-end mb-4">
                        <Button
                            onClick={handleExtractTopics}
                            disabled={extracting}
                            variant="secondary"
                            className="gap-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        >
                            {extracting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            {extracting ? "Extracting..." : "Generate topics"}
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-2">
                            <Label>Subject</Label>
                            <Select value={genSubject} onValueChange={setGenSubject}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="physics">Physics</SelectItem>
                                    <SelectItem value="math">Mathematics</SelectItem>
                                    <SelectItem value="chemistry">Chemistry</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Level</Label>
                            <Select value={genLevel} onValueChange={setGenLevel}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="easy">Easy</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="hard">Hard</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Quantity</Label>
                            <Input
                                type="number"
                                min="1"
                                max="50"
                                value={genCount}
                                onChange={(e) => setGenCount(parseInt(e.target.value) || 0)}
                                className="bg-white dark:bg-slate-950"
                            />
                        </div>

                        <Button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white w-full"
                        >
                            {generating ? (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                "Generate"
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Subject Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {["physics", "math", "chemistry"].map((subject) => (
                    <Card
                        key={subject}
                        onClick={() => handleCardClick(subject)}
                        className={`cursor-pointer transition-all hover:shadow-md border-slate-200 dark:border-slate-800 hover:border-emerald-500`}
                    >

                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center justify-between capitalize">
                                <div className="flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-slate-500" />
                                    {subject}
                                </div>
                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                                    {loadingStats ? "-" : getSubjectTotal(subject)} Available
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground mt-2">
                                {["easy", "medium", "hard"].map(lvl => (
                                    <div key={lvl} className="p-2 bg-slate-50 dark:bg-slate-900 rounded-md flex flex-col gap-1">
                                        <div className="font-semibold text-slate-900 dark:text-slate-200 capitalize mb-1">{lvl}</div>
                                        <div className="flex justify-between px-1" title="Available">
                                            <span className="text-emerald-600 font-medium">Avail:</span>
                                            <span>{loadingStats ? "-" : stats?.[subject]?.[lvl]?.unused || 0}</span>
                                        </div>
                                        <div className="flex justify-between px-1" title="Used">
                                            <span className="text-amber-600 font-medium">Used:</span>
                                            <span>{loadingStats ? "-" : stats?.[subject]?.[lvl]?.used || 0}</span>
                                        </div>
                                        <div className="flex justify-between px-1" title="Attempted">
                                            <span className="text-blue-600 font-medium">Att:</span>
                                            <span>{loadingStats ? "-" : stats?.[subject]?.[lvl]?.attempted || 0}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                        </CardContent>
                    </Card>
                ))}
            </div>


        </div>

    );
};


export default QuestionBank;
