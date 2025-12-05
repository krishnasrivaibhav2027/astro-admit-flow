import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useStudentProgress } from "@/hooks/useAppQueries";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Award, CheckCircle, Crown, Lock, Target, TrendingUp, Trophy, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type LevelStatus = "locked" | "current" | "completed";

interface LevelData {
  level: "easy" | "medium" | "hard";
  title: string;
  icon: typeof Target;
  color: string;
  description: string;
  status: LevelStatus;
  attempts: number;
  maxAttempts: number;
}

const Levels = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const studentId = location.state?.studentId;
  const { data: results, isLoading } = useStudentProgress(studentId || sessionStorage.getItem('studentId'));

  const initialLevels: LevelData[] = [
    {
      level: "easy",
      title: "Easy Level",
      icon: Target,
      color: "from-emerald-400 to-emerald-600",
      description: "Foundation concepts",
      status: "current",
      attempts: 0,
      maxAttempts: 1
    },
    {
      level: "medium",
      title: "Medium Level",
      icon: Zap,
      color: "from-blue-400 to-blue-600",
      description: "Intermediate concepts",
      status: "locked",
      attempts: 0,
      maxAttempts: 2
    },
    {
      level: "hard",
      title: "Hard Level",
      icon: Crown,
      color: "from-purple-400 to-pink-500",
      description: "Advanced concepts",
      status: "locked",
      attempts: 0,
      maxAttempts: 2
    }
  ];

  const [testCompleted, setTestCompleted] = useState(false);

  // Derive levels from query data
  const levels = useMemo(() => {
    if (!results || results.length === 0) return initialLevels;

    const easyPassed = results.some(r => r.level === "easy" && r.result === "pass");
    const mediumPassed = results.some(r => r.level === "medium" && r.result === "pass");
    const hardPassed = results.some(r => r.level === "hard" && r.result === "pass");

    const latestResult = results[0]; // Results are ordered by created_at desc
    // We need to find the latest attempt counts. 
    // Actually, the backend might return separate rows for each attempt or a summary.
    // Looking at previous code: "latestResult.attempts_easy". It seems there's a summary record or the latest record has the counts.
    // Let's assume the latest record has the cumulative counts as per previous logic.

    const easyAttempts = latestResult.attempts_easy || 0;
    const mediumAttempts = latestResult.attempts_medium || 0;
    const hardAttempts = latestResult.attempts_hard || 0;

    const newLevels = [...initialLevels];
    newLevels[0].attempts = easyAttempts;
    newLevels[1].attempts = mediumAttempts;
    newLevels[2].attempts = hardAttempts;

    // Easy Level
    if (easyPassed || easyAttempts >= 1) {
      newLevels[0].status = "completed";
    } else {
      newLevels[0].status = "current";
    }

    // Medium Level
    if (mediumPassed || (easyPassed && mediumAttempts >= 2)) {
      newLevels[1].status = "completed";
    } else if (easyPassed) {
      newLevels[1].status = "current";
    } else {
      newLevels[1].status = "locked";
    }

    // Hard Level
    if (hardPassed || (mediumPassed && hardAttempts >= 2)) {
      newLevels[2].status = "completed";
    } else if (mediumPassed) {
      newLevels[2].status = "current";
    } else {
      newLevels[2].status = "locked";
    }

    return newLevels;
  }, [results]);

  useEffect(() => {
    if (!results) return;

    const easyPassed = results.some(r => r.level === "easy" && r.result === "pass");
    const mediumPassed = results.some(r => r.level === "medium" && r.result === "pass");
    const hardPassed = results.some(r => r.level === "hard" && r.result === "pass");

    // Check for failure completion
    const latestResult = results[0];
    const easyAttempts = latestResult?.attempts_easy || 0;
    const mediumAttempts = latestResult?.attempts_medium || 0;
    const hardAttempts = latestResult?.attempts_hard || 0;

    const easyFailedCompletely = easyAttempts >= 1 && !easyPassed;
    const mediumFailedCompletely = easyPassed && mediumAttempts >= 2 && !mediumPassed;
    const hardFailedCompletely = mediumPassed && hardAttempts >= 2 && !hardPassed;

    const isComplete = (easyPassed && mediumPassed && hardPassed) || easyFailedCompletely || mediumFailedCompletely || hardFailedCompletely;
    setTestCompleted(isComplete);
  }, [results]);

  const handleStartLevel = (level: LevelData) => {
    if (level.status === "locked" || level.status === "completed") return;

    navigate("/test", {
      state: {
        studentId: sessionStorage.getItem('studentId'),
        level: level.level,
        currentAttempt: level.attempts + 1
      }
    });
  };

  // Calculate overall progress
  const completedLevels = levels.filter(l => l.status === "completed").length;
  const progressPercentage = Math.round((completedLevels / 3) * 100);

  return (
    <div className="min-h-screen relative overflow-hidden transition-colors duration-500">
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
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Overall Progress</span>
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
                const studentId = sessionStorage.getItem('studentId');
                const { data: allResults } = await supabase
                  .from("results")
                  .select("*")
                  .eq("student_id", studentId)
                  .order("created_at", { ascending: true });

                navigate("/final-results", {
                  state: {
                    studentId,
                    allResults: allResults?.filter(r => ["easy", "medium", "hard"].includes(r.level)) || []
                  }
                });
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

                        {/* Success Pulse Animation Removed */}
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
                          {level.level === 'easy' ? '5' : level.level === 'medium' ? '3' : '2'} Questions
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
                        <span>Attempts: {level.attempts} / {level.maxAttempts}</span>
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
                          Review
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
                            // Check if there is a pending result for this level to show "Resume"
                            results?.some(r => r.level === level.level && r.result === 'pending') ? "Resume Test" : "Start Test"
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
};

export default Levels;
