import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useStudentProgress } from "@/hooks/useAppQueries";
import { motion } from "framer-motion";
import { Atom, Award, Calculator, CheckCircle, Crown, FlaskConical, Lock, Target, TrendingUp, Trophy, Zap } from "lucide-react";
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
}

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

export function SubjectSelection() {
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();
    const studentId = sessionStorage.getItem('studentId'); // Use sessionStorage as primary
    const { data: results, isLoading } = useStudentProgress(studentId);
    const [selectedSubject, setSelectedSubject] = useState<Subject>('math');

    const subjects = [
        { id: 'math' as const, name: 'Mathematics', icon: Calculator },
        { id: 'physics' as const, name: 'Physics', icon: Atom },
        { id: 'chemistry' as const, name: 'Chemistry', icon: FlaskConical }
    ];

    const initialLevels: LevelData[] = [
        {
            level: "easy",
            title: "Easy Level",
            icon: Target,
            color: "from-emerald-400 to-emerald-600",
            description: "Foundation concepts",
            status: "current",
            attempts: 0,
            maxAttempts: 999 // Unlimited attempts allowed logic-wise, but UI shows counts
        },
        {
            level: "medium",
            title: "Medium Level",
            icon: Zap,
            color: "from-blue-400 to-blue-600",
            description: "Intermediate concepts",
            status: "locked",
            attempts: 0,
            maxAttempts: 999
        },
        {
            level: "hard",
            title: "Hard Level",
            icon: Crown,
            color: "from-purple-400 to-pink-500",
            description: "Advanced concepts",
            status: "locked",
            attempts: 0,
            maxAttempts: 999
        }
    ];

    const [testCompleted, setTestCompleted] = useState(false);
    const [subjectLockInfo, setSubjectLockInfo] = useState<{ isLocked: boolean, reason: string }>({ isLocked: false, reason: '' });

    // Derive levels from query data
    const levels = useMemo(() => {
        if (!results) return initialLevels;

        // 1. Check Global Subject Locking (Math -> Physics -> Chemistry)
        const mathAttempts = results.filter((r: any) => (r.subject || 'physics').toLowerCase() === 'math');
        const physicsAttempts = results.filter((r: any) => (r.subject || 'physics').toLowerCase() === 'physics');

        const mathHardPassed = mathAttempts.some((r: any) => r.level === 'hard' && r.result === 'pass');
        const physicsHardPassed = physicsAttempts.some((r: any) => r.level === 'hard' && r.result === 'pass');

        let isLocked = false;
        let lockReason = "";

        if (selectedSubject === 'physics' && !mathHardPassed) {
            isLocked = true;
            lockReason = "Complete Mathematics (Hard Level) to unlock Physics.";
        } else if (selectedSubject === 'chemistry' && !physicsHardPassed) {
            isLocked = true;
            lockReason = "Complete Physics (Hard Level) to unlock Chemistry.";
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

        const latestResult = (subjectResults[0] || {}) as Partial<Result>;
        const easyAttempts = latestResult.attempts_easy || 0;
        const mediumAttempts = latestResult.attempts_medium || 0;
        const hardAttempts = latestResult.attempts_hard || 0;

        // Check for pending attempts in this subject
        const easyPending = subjectResults.some((r: any) => r.level === "easy" && r.result === "pending");
        const mediumPending = subjectResults.some((r: any) => r.level === "medium" && r.result === "pending");
        const hardPending = subjectResults.some((r: any) => r.level === "hard" && r.result === "pending");


        const newLevels = JSON.parse(JSON.stringify(initialLevels)); // Deep copy
        newLevels[0].attempts = easyAttempts;
        newLevels[1].attempts = mediumAttempts;
        newLevels[2].attempts = hardAttempts;

        if (isLocked) {
            // If subject is locked, lock all levels unless they have a pending resume state (unlikely for a locked subject)
            newLevels[0].status = "locked";
            newLevels[1].status = "locked";
            newLevels[2].status = "locked";
        } else {
            // Easy Level
            if (easyPassed) {
                newLevels[0].status = "completed";
            } else if (easyAttempts >= 1 && !easyPending) { // Attempted but failed or just started? If failed and not pending, it's "current" (retry)
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
            // If pending, it should be accessible
            if (mediumPending) newLevels[1].status = "current";


            // Hard Level
            if (hardPassed) {
                newLevels[2].status = "completed";
            } else if (mediumPassed) {
                newLevels[2].status = "current";
            } else {
                newLevels[2].status = "locked";
            }
            // If pending, accessible
            if (hardPending) newLevels[2].status = "current";
        }

        return newLevels;
    }, [results, selectedSubject]);

    useEffect(() => {
        if (!results) return;

        // Overall test completion check (aggregated across relevant subjects or just current?)
        // The original code checked if "easy, medium, hard" were passed or max attempts reached.
        // For Multi-subject, "Test Completed" might mean "All subjects completed" or "Current subject completed".
        // Let's assume per-subject completion for the banner or global?
        // User requested "Go to Results" which usually implies the whole thing is done or they want to see progress.
        // Let's keep it simple: Show banner if ANY subject has significant progress or just keep the button always visible? 
        // The user's provided code shows it if `testCompleted`.
        // Let's define `testCompleted` as "Current Subject passed Hard level" OR "All subjects passed".
        // For now, let's map it to "Hard Level passed in current subject" to show the "Level Completed" banner.

        // Actually, the banner says "Test Completed! Go to Results".
        // Let's show it if Hard level is passed for the current subject.
        const subjectResults = results.filter(
            (r: any) => (r.subject || 'physics').toLowerCase() === selectedSubject
        );
        const hardPassed = subjectResults.some((r: any) => r.level === "hard" && r.result === "pass");
        setTestCompleted(hardPassed);

    }, [results, selectedSubject]);

    const handleStartLevel = (level: LevelData) => {
        if (level.status === "locked" && !subjectLockInfo.isLocked) {
            // Double check legitimate locking
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

    // Calculate overall progress (Average of all subjects or just current?)
    // User UI shows "Overall Progress".
    const progressPercentage = useMemo(() => {
        // Calculate total levels passed across ALL subjects
        if (!results) return 0;
        // We have 3 subjects * 3 levels = 9 levels total.
        // But maybe we just show current subject progress?
        // "Overall Progress" usually implies the whole exam.
        // Let's stick to Current Subject Progress to avoid confusion with the single bar.
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

                {/* Subject Tabs - Inserted Here */}
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

                {/* Completion Banner */}
                {testCompleted && (
                    <motion.div
                        className="max-w-4xl mx-auto mb-16 bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 dark:from-emerald-500/10 dark:to-emerald-500/5 border border-emerald-500/40 dark:border-emerald-500/30 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between backdrop-blur-sm relative overflow-hidden gap-4"
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
                                <p className="text-xl font-bold text-slate-900 dark:text-white">Subject Completed!</p>
                                <motion.span
                                    className="text-2xl"
                                    animate={{ rotate: [0, 10, -10, 0] }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                >
                                    🎉
                                </motion.span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 text-sm">You can now proceed to the next subject or view results.</p>
                        </div>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 relative z-10 shadow-lg shadow-emerald-500/20 dark:bg-none"
                            onClick={async () => {
                                navigate("/final-results");
                            }}
                        >
                            <Trophy className="w-4 h-4" />
                            Go to Results
                        </Button>
                    </motion.div>
                )}

                {/* Level Cards with Progress Flow */}
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
                                            {(isCompleted || level.attempts > 0) ? (
                                                <Button
                                                    variant="outline"
                                                    className={`w-full ${level.level === 'easy' ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10' : level.level === 'medium' ? 'border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10' : 'border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10'} dark:bg-transparent`}
                                                    onClick={() => navigate(`/review/${level.level}`)}
                                                >
                                                    Review Test
                                                </Button>
                                            ) : (
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
                                                        // Check for pending
                                                        results?.some((r: any) => (r.subject || 'physics').toLowerCase() === selectedSubject && r.level === level.level && r.result === 'pending') ? "Resume Test" : "Start Test"
                                                    )}
                                                </Button>
                                            )}
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
