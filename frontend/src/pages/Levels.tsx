import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAppSettings, useStudentProgress } from "@/hooks/useAppQueries";
import { motion } from "framer-motion";
import { Atom, Award, Bot, Calculator, CheckCircle, Crown, FlaskConical, Lock, Sparkles, Target, TrendingUp, Trophy, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type LevelStatus = "locked" | "current" | "completed";
type Subject = 'math' | 'physics' | 'chemistry';

interface LevelData {
    level: "easy" | "medium" | "hard";
    title: string;
    icon: any;
    color: string;
    description: string;
    status: LevelStatus;
    attempts: number;
    maxAttempts: number;
    isPending: boolean;
}

// ... existing interfaces ...

interface Result {
    id: string;
    student_id: string;
    subject: string;
    level: string;
    result: string;
    score: number;
    attempts_easy: number;
    attempts_medium: number;
    attempts_hard: number;
    created_at: string;
}

export default function Levels() {
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();
    const studentId = sessionStorage.getItem('studentId');
    const { data: results, isLoading } = useStudentProgress(studentId);
    const { data: settings } = useAppSettings();
    const [selectedSubject, setSelectedSubject] = useState<Subject>('math');

    const subjects = [
        { id: 'math' as const, name: 'Mathematics', icon: Calculator },
        { id: 'physics' as const, name: 'Physics', icon: Atom },
        { id: 'chemistry' as const, name: 'Chemistry', icon: FlaskConical }
    ];

    const [testCompleted, setTestCompleted] = useState(false);
    const [subjectLockInfo, setSubjectLockInfo] = useState<{ isLocked: boolean, reason: string }>({ isLocked: false, reason: '' });

    const initialLevels: LevelData[] = [
        {
            level: "easy",
            title: "Easy Level",
            icon: Target,
            color: "from-emerald-400 to-emerald-600",
            description: "Foundation concepts",
            status: "current",
            attempts: 0,
            maxAttempts: 3,
            isPending: false
        },
        {
            level: "medium",
            title: "Medium Level",
            icon: Zap,
            color: "from-blue-400 to-blue-600",
            description: "Intermediate concepts",
            status: "locked",
            attempts: 0,
            maxAttempts: 3,
            isPending: false
        },
        {
            level: "hard",
            title: "Hard Level",
            icon: Crown,
            color: "from-purple-400 to-pink-500",
            description: "Advanced concepts",
            status: "locked",
            attempts: 0,
            maxAttempts: 3,
            isPending: false
        }
    ];

    // ... existing state ...

    // Derive levels from query data
    const levels = useMemo(() => {
        if (!results) return initialLevels;

        // ... (lines 92-130: unchanged locking logic) ...
        // 1. Check Global Subject Locking
        // Helper to check subject completion status
        const checkSubjectCompletion = (subjectName: string) => {
            const subjectAttempts = results.filter((r: any) => (r.subject || 'physics').toLowerCase() === subjectName);

            // Check Pass Status
            const mediumPassed = subjectAttempts.some((r: any) => r.level === 'medium' && r.result === 'pass');
            const hardPassed = subjectAttempts.some((r: any) => r.level === 'hard' && r.result === 'pass');

            // Check Attempts for Hard Level
            const hardResult = subjectAttempts.find((r: any) => r.level === 'hard');
            const hardAttempts = hardResult?.attempts_hard || 0;

            const maxAttempts = settings?.max_attempts || 3;

            // Condition: Medium MUST be passed, AND Hard must be (Passed OR Max Attempts Reached)
            const hardCompleted = hardPassed || (hardAttempts >= maxAttempts);

            return mediumPassed && hardCompleted;
        };

        const mathUnlockedNext = checkSubjectCompletion('math');
        const physicsUnlockedNext = checkSubjectCompletion('physics');

        let isLocked = false;
        let lockReason = "";

        if (selectedSubject === 'physics' && !mathUnlockedNext) {
            isLocked = true;
            lockReason = "Complete Mathematics (Pass Medium & Attempt/Pass Hard) to unlock Physics.";
        } else if (selectedSubject === 'chemistry' && !physicsUnlockedNext) {
            isLocked = true;
            lockReason = "Complete Physics (Pass Medium & Attempt/Pass Hard) to unlock Chemistry.";
        }

        setSubjectLockInfo({ isLocked, reason: lockReason });


        // 2. Filter results for current subject
        const subjectResults = results.filter(
            (r: any) => (r.subject || 'physics').toLowerCase() === selectedSubject
        );

        // 3. Calculate status for this subject
        const easyPassed = subjectResults.some((r: any) => r.level === "easy" && r.result === "pass");
        const mediumPassed = subjectResults.some((r: any) => r.level === "medium" && r.result === "pass");
        const hardPassed = subjectResults.some((r: any) => r.level === "hard" && r.result === "pass");

        // Calculate attempts
        const easyAttempts = subjectResults.filter((r: any) => r.level === 'easy').length;
        const mediumAttempts = subjectResults.filter((r: any) => r.level === 'medium').length;
        const hardAttempts = subjectResults.filter((r: any) => r.level === 'hard').length;

        // Check for pending attempts in this subject
        const easyPending = subjectResults.some((r: any) => r.level === "easy" && (r.result === "pending" || r.result === "in_progress"));
        const mediumPending = subjectResults.some((r: any) => r.level === "medium" && (r.result === "pending" || r.result === "in_progress"));
        const hardPending = subjectResults.some((r: any) => r.level === "hard" && (r.result === "pending" || r.result === "in_progress"));


        const newLevels = initialLevels.map(level => ({ ...level }));

        // Dynamic Max Attempts Logic
        const dynamicMaxAttempts = settings?.max_attempts || 3;

        // Easy Level: Fixed at 1 attempt
        newLevels[0].maxAttempts = 1;
        newLevels[1].maxAttempts = dynamicMaxAttempts;
        newLevels[2].maxAttempts = dynamicMaxAttempts;

        newLevels[0].attempts = easyAttempts;
        newLevels[1].attempts = mediumAttempts;
        newLevels[2].attempts = hardAttempts;

        newLevels[0].isPending = easyPending;
        newLevels[1].isPending = mediumPending;
        newLevels[2].isPending = hardPending;

        if (isLocked) {
            newLevels[0].status = "locked";
            newLevels[1].status = "locked";
            newLevels[2].status = "locked";
        } else {
            // Easy Level
            if (easyPassed) {
                newLevels[0].status = "completed";
            } else if (easyAttempts >= 1 && !easyPending) {
                newLevels[0].status = "current";
            } else {
                newLevels[0].status = "current";
            }

            // Medium Level
            if (mediumPassed) {
                newLevels[1].status = "completed";
            } else if (easyPassed) {
                newLevels[1].status = "current";
            } else {
                newLevels[1].status = "locked";
            }
            if (mediumPending) newLevels[1].status = "current";


            // Hard Level
            if (hardPassed) {
                newLevels[2].status = "completed";
            } else if (mediumPassed) {
                newLevels[2].status = "current";
            } else {
                newLevels[2].status = "locked";
            }
            if (hardPending) newLevels[2].status = "current";
        }

        return newLevels;
    }, [results, selectedSubject, settings]);

    useEffect(() => {
        if (!results) return;

        // GLOBAL CHECK: Check comprehensive status across ALL subjects
        // Because 'levels' only reflects the currently selected subject tab.

        const allSubjects = ['math', 'physics', 'chemistry'];

        const checkGlobalFailure = () => {
            // Failure Condition: FAILED Max Attempts on Easy or Medium in ANY subject
            for (const sub of allSubjects) {
                const subResults = results.filter((r: any) => (r.subject || 'physics').toLowerCase() === sub);

                // Easy Check
                const easyAttempts = subResults.filter((r: any) => r.level === 'easy').length;
                const easyPassed = subResults.some((r: any) => r.level === 'easy' && r.result === 'pass');
                const easyMax = 1; // Hardcoded matches logic above

                if (!easyPassed && easyAttempts >= easyMax) return true;

                // Medium Check
                const mediumAttempts = subResults.filter((r: any) => r.level === 'medium').length;
                const mediumPassed = subResults.some((r: any) => r.level === 'medium' && r.result === 'pass');
                const mediumMax = settings?.max_attempts || 3;

                if (!mediumPassed && mediumAttempts >= mediumMax) return true;
            }
            return false;
        };

        const checkGlobalSuccess = () => {
            // Success Condition: ALL subjects must be effectively "done"
            // Done = Passed Medium + (Passed Hard OR Attempted Hard Max Times)
            return allSubjects.every(sub => {
                const subResults = results.filter((r: any) => (r.subject || 'physics').toLowerCase() === sub);

                const mediumPassed = subResults.some((r: any) => r.level === 'medium' && r.result === 'pass');
                const hardPassed = subResults.some((r: any) => r.level === 'hard' && r.result === 'pass');
                const hardAttempts = subResults.filter((r: any) => r.level === 'hard').length;
                const hardMax = settings?.max_attempts || 3;

                // Subject is done if Medium passed AND (Hard is passed or We tried enough)
                const hardDone = hardPassed || hardAttempts >= hardMax;

                return mediumPassed && hardDone;
            });
        };

        const isFailed = checkGlobalFailure();
        const isSuccess = !isFailed && checkGlobalSuccess();

        setTestCompleted(isSuccess || isFailed);

    }, [results, settings]);

    const handleStartLevel = (level: LevelData) => {
        if (level.status === "locked" && !subjectLockInfo.isLocked) {
            return;
        }
        if (subjectLockInfo.isLocked) {
            toast({ title: "Subject Locked", description: subjectLockInfo.reason, variant: "destructive" });
            return;
        }

        navigate("/test", {
            state: {
                studentId,
                subject: selectedSubject,
                level: level.level,
                currentAttempt: level.attempts + 1
            }
        });
    };

    const progressPercentage = useMemo(() => {
        if (!results) return 0;
        const passedCount = levels.filter(l => l.status === 'completed').length;
        return Math.round((passedCount / 3) * 100);
    }, [levels]);


    return (
        <div className="min-h-screen relative overflow-hidden transition-colors duration-500 bg-slate-50 dark:bg-slate-950">
            {/* Animated Gradient Orbs */}
            <motion.div
                className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/20 dark:bg-emerald-500/30 rounded-full blur-3xl pointer-events-none"
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.2, 0.4, 0.2]
                }}
                transition={{ duration: 6, repeat: Infinity }}
            />
            <motion.div
                className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/20 dark:bg-blue-500/30 rounded-full blur-3xl pointer-events-none"
                animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.2, 0.4, 0.2]
                }}
                transition={{ duration: 8, repeat: Infinity }}
            />

            {/* Main Content */}
            <div className="container mx-auto px-6 py-12 relative z-10">
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    {/* Title */}
                    <h1 className="text-4xl md:text-5xl font-bold mb-3 text-slate-900 dark:text-white">
                        Test <span className="text-emerald-500 dark:text-emerald-400">Levels</span>
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 text-lg">
                        Progress through each level to complete your admission test
                    </p>
                </motion.div>

                {/* Completion Banner - Positioned ABOVE Progress Bar */}
                {testCompleted && (
                    <motion.div
                        className="max-w-4xl mx-auto mb-8 bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 dark:from-emerald-500/10 dark:to-emerald-500/5 border border-emerald-500/40 dark:border-emerald-500/30 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between backdrop-blur-sm relative overflow-hidden gap-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                    >
                        {/* Animated background */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent dark:from-emerald-500/5"
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        />

                        <div className="relative z-10 text-center md:text-left">
                            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                                <p className="text-xl font-bold text-slate-900 dark:text-white">Test Completed!</p>
                                <motion.span
                                    className="text-2xl"
                                    animate={{ rotate: [0, 10, -10, 0] }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                >
                                    🎉
                                </motion.span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 text-sm">View your final results and performance summary</p>
                        </div>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 relative z-10 shadow-lg shadow-emerald-500/20 dark:bg-none"
                            onClick={async () => {
                                navigate("/final-results", { state: { studentId } });
                            }}
                        >
                            <Trophy className="w-4 h-4" />
                            Go to Results
                        </Button>
                    </motion.div>
                )}

                {/* Overall Progress Bar */}
                <motion.div
                    className="max-w-4xl mx-auto mb-12"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Subject Progress</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{progressPercentage}%</span>
                    </div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
                        <motion.div
                            className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 rounded-full relative"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercentage}%` }}
                            transition={{ duration: 2, delay: 0.5, ease: "easeOut" }}
                        >
                            {/* Glowing effect */}
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                animate={{ x: ['-100%', '200%'] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                            />
                        </motion.div>
                    </div>
                </motion.div>

                {/* T.A.R.S AI Button */}
                <motion.div
                    className="max-w-4xl mx-auto mb-8 flex justify-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                >
                    <button
                        onClick={() => navigate('/tars-ai')}
                        className="group relative px-6 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-300 flex items-center gap-3 overflow-hidden"
                    >
                        {/* Animated shine effect */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
                            animate={{ x: ['0%', '200%'] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        />

                        <div className="relative flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                <Bot className="w-5 h-5" />
                            </div>
                            <span>T.A.R.S AI</span>
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                <Sparkles className="w-4 h-4 opacity-80" />
                            </motion.div>
                        </div>
                    </button>
                </motion.div>

                {/* Subject Tabs */}
                <motion.div
                    className="max-w-4xl mx-auto mb-16 flex justify-center"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-2 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 inline-flex items-center gap-2">
                        {subjects.map((subject) => {
                            const Icon = subject.icon;
                            const isSelected = selectedSubject === subject.id;
                            return (
                                <button
                                    key={subject.id}
                                    onClick={() => setSelectedSubject(subject.id)}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all text-sm font-bold ${isSelected
                                        ? 'bg-emerald-500 text-white shadow-md'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span>{subject.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Subject Lock Banner */}
                {subjectLockInfo.isLocked && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="max-w-4xl mx-auto mb-8 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-4 flex items-center gap-4"
                    >
                        <div className="bg-amber-100 dark:bg-amber-800/50 p-2 rounded-full text-amber-600 dark:text-amber-400">
                            <Lock className="w-5 h-5" />
                        </div>
                        <p className="text-amber-800 dark:text-amber-200 font-medium">{subjectLockInfo.reason}</p>
                    </motion.div>
                )}


                <div className="max-w-6xl mx-auto relative">
                    {/* Flowing Connection Lines - Visible on large screens */}
                    <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 hidden lg:block -z-10">
                        <motion.div
                            className="h-full bg-gradient-to-r from-emerald-500/30 via-blue-500/30 to-purple-500/30 rounded-full relative"
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ duration: 2, delay: 1 }}
                            style={{ transformOrigin: "left" }}
                        >
                            {/* Glowing particles flowing */}
                            <motion.div
                                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-400 rounded-full shadow-lg shadow-emerald-500"
                                animate={{ x: ['0%', '100%'] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            />
                            <motion.div
                                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-400 rounded-full shadow-lg shadow-blue-500"
                                animate={{ x: ['0%', '100%'] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: 1 }}
                            />
                        </motion.div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-0">
                        {levels.map((level, index) => {
                            const isLocked = level.status === "locked";
                            const isCompleted = level.status === "completed";
                            const isCurrent = level.status === "current";
                            const Icon = level.icon;

                            // Define colors based on level type
                            let borderColor = "border-slate-200 dark:border-slate-800";
                            let shadowColor = "";
                            let gradientColor = "";
                            let iconColor = "";
                            let progressColor = "";

                            if (level.level === "easy") {
                                borderColor = isCurrent || isCompleted ? "border-emerald-500/60 dark:border-emerald-500/50" : borderColor;
                                shadowColor = "rgba(16, 185, 129, 0.3)";
                                gradientColor = "from-emerald-400 to-emerald-600";
                                iconColor = "text-emerald-400";
                                progressColor = "bg-emerald-500";
                            } else if (level.level === "medium") {
                                borderColor = isCurrent || isCompleted ? "border-blue-500/60 dark:border-blue-500/50" : borderColor;
                                shadowColor = "rgba(59, 130, 246, 0.3)";
                                gradientColor = "from-blue-400 to-blue-600";
                                iconColor = "text-blue-400";
                                progressColor = "bg-blue-500";
                            } else { // hard
                                borderColor = isCurrent || isCompleted ? "border-purple-500/60 dark:border-purple-500/50" : borderColor;
                                shadowColor = "rgba(168, 85, 247, 0.3)";
                                gradientColor = "from-purple-400 to-pink-500";
                                iconColor = "text-purple-400";
                                progressColor = "bg-purple-500";
                            }

                            return (
                                <motion.div
                                    key={level.level}
                                    className="relative"
                                    initial={{ opacity: 0, y: 50 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.8, delay: 0.6 + (index * 0.2) }}
                                >
                                    <motion.div
                                        className={`
                    ${isLocked ? 'opacity-70 grayscale-[0.5]' : ''}
                    bg-white/80 dark:bg-slate-800/50 border ${borderColor} 
                    rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden h-full flex flex-col
                  `}
                                        whileHover={!isLocked ? {
                                            scale: 1.03,
                                            borderColor: borderColor.replace('/60', '').replace('/50', ''),
                                            boxShadow: `0 20px 40px ${shadowColor}`
                                        } : {}}
                                    >
                                        {/* Top Progress Line */}
                                        <div className="absolute top-0 left-0 w-full h-1 bg-slate-200 dark:bg-slate-700">
                                            {(isCompleted || isCurrent) && (
                                                <motion.div
                                                    className={`h-full bg-gradient-to-r ${gradientColor}`}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: isCompleted ? "100%" : "50%" }}
                                                    transition={{ duration: 1.5, delay: 1 + (index * 0.2) }}
                                                />
                                            )}
                                        </div>

                                        {/* Level Number Badge */}
                                        <div className={`absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center shadow-lg z-10 ${isLocked ? 'bg-slate-400' : progressColor}`}>
                                            <span className="text-sm text-white font-bold">{index + 1}</span>
                                        </div>

                                        {/* Icon Circle */}
                                        <div className="flex justify-center mb-6 mt-2">
                                            <motion.div
                                                className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${gradientColor} flex items-center justify-center shadow-xl relative`}
                                                whileHover={!isLocked ? { rotate: [0, 5, -5, 0] } : {}}
                                            >
                                                {isLocked ? (
                                                    <Lock className="w-10 h-10 text-white/80" />
                                                ) : isCompleted ? (
                                                    <CheckCircle className="w-10 h-10 text-white" />
                                                ) : (
                                                    <Icon className="w-10 h-10 text-white" />
                                                )}
                                            </motion.div>
                                        </div>

                                        <h3 className="text-center text-xl font-bold mb-2 text-slate-900 dark:text-white">{level.title}</h3>

                                        <div className="flex items-center justify-center gap-2 mb-4 min-h-[24px]">
                                            {isCompleted ? (
                                                <>
                                                    <Award className={`w-4 h-4 ${iconColor}`} />
                                                    <p className={`text-center ${iconColor} text-sm font-medium`}>Completed</p>
                                                </>
                                            ) : isCurrent ? (
                                                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                                    Current
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-slate-500">Locked</Badge>
                                            )}
                                        </div>

                                        {/* Questions Progress */}
                                        <div className="bg-slate-100/50 dark:bg-slate-900/50 rounded-lg p-3 mb-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs text-slate-600 dark:text-slate-400">Questions</span>
                                                <span className={`text-xs font-medium ${isLocked ? 'text-slate-400' : iconColor}`}>
                                                    {level.level === 'easy' ? '5' : level.level === 'medium' ? '5' : '5'} Questions
                                                </span>
                                            </div>
                                            <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <motion.div
                                                    className={`h-full ${progressColor}`}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: isCompleted ? "100%" : "0%" }}
                                                    transition={{ duration: 1, delay: 1.2 + (index * 0.2) }}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2 mb-6 flex-grow">
                                            <p className="text-slate-600 dark:text-slate-400 text-sm text-center">
                                                {level.description}
                                            </p>
                                            <div className="flex items-center justify-center gap-1 text-slate-500 text-xs">
                                                <TrendingUp className="w-3 h-3" />
                                                <span>Attempts: {level.attempts}</span>
                                            </div>
                                        </div>

                                        {/* Action Button */}
                                        <div className="mt-auto">
                                            {/* Only allow review if completed OR (attempts check passed AND NOT pending) */}
                                            {/* Calculating isPending here for clarity inside the map */}
                                            {(() => {
                                                const isPending = results?.some((r: any) =>
                                                    (r.subject || 'physics').toLowerCase() === selectedSubject &&
                                                    r.level === level.level &&
                                                    (r.result === 'pending' || r.result === 'in_progress')
                                                );

                                                const canRetake = !isCompleted && level.attempts < level.maxAttempts;

                                                // UPDATED LOGIC: Always show Review if there is a past attempt (and not currently pending)
                                                // The "Retry Test" button is now located inside the Review page.
                                                if (!isPending && level.attempts > 0) {
                                                    return (
                                                        <Button
                                                            variant="outline"
                                                            className={`w-full ${level.level === 'easy' ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10' : level.level === 'medium' ? 'border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10' : 'border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10'} dark:bg-transparent`}
                                                            onClick={() => navigate(`/review/${level.level}`, {
                                                                state: {
                                                                    studentId,
                                                                    subject: selectedSubject,
                                                                    level: level.level
                                                                }
                                                            })}
                                                        >
                                                            Review Test
                                                        </Button>
                                                    );
                                                } else {
                                                    return (
                                                        <Button
                                                            className={`w-full ${isLocked ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20'} dark:bg-none`}
                                                            disabled={isLocked}
                                                            onClick={() => handleStartLevel(level)}
                                                        >
                                                            {isLocked ? (
                                                                <>
                                                                    <Lock className="w-4 h-4 mr-2" />
                                                                    Locked
                                                                </>
                                                            ) : (
                                                                isPending ? "Resume Test" : (level.attempts > 0 ? "Retry Test" : "Start Test")
                                                            )}
                                                        </Button>
                                                    );
                                                }
                                            })()}
                                        </div>
                                    </motion.div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
}
