import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Award, CheckCircle, Lock, TrendingUp } from "lucide-react";

interface LevelData {
    level: "easy" | "medium" | "hard";
    title: string;
    icon: any;
    color: string;
    description: string;
    status: "locked" | "current" | "completed";
    attempts: number;
    maxAttempts: number;
}

interface VariantProps {
    levels: LevelData[];
    onStartLevel: (level: LevelData) => void;
    navigate: (path: string) => void;
    results: any[];
    selectedSubject: string;
}

export function Variant1FlowingPaths({ levels, onStartLevel, navigate, results, selectedSubject }: VariantProps) {
    return (
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
                                            onClick={() => onStartLevel(level)}
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
    );
}
