// FinalResults.tsx
import { ModeToggle } from "@/components/mode-toggle";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Home, Trophy, XCircle } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * FinalResults component
 * - Fetches actual scores from backend API (same as leaderboard)
 * - Shows accurate scores that match the leaderboard
 */

/* -------------------- Types -------------------- */
type LevelName = "easy" | "medium" | "hard";
type NormalizedResult = "pass" | "fail";

interface Criteria {
  Relevance?: number;
  Clarity?: number;
  SubjectUnderstanding?: number;
  Accuracy?: number;
  Completeness?: number;
  CriticalThinking?: number;
  [key: string]: number | undefined;
}

interface RawResult {
  level?: string;
  result?: string | boolean;
  score?: number;
  criteria?: Criteria;
  [key: string]: any;
}

interface NormalizedItem {
  level: LevelName;
  result: NormalizedResult;
  score: number;
  criteria: Criteria;
}

interface StudentScore {
  student_name: string;
  total_score: number;
  total_time_minutes: number;
  levels_passed: number;
  email: string;
}

/* -------------------- Helpers -------------------- */

const normalizeLevel = (raw?: string): LevelName | null => {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  if (s === "easy") return "easy";
  if (s === "medium") return "medium";
  if (s === "hard") return "hard";
  return null;
};

const normalizeResult = (raw?: string | boolean): NormalizedResult => {
  if (typeof raw === "boolean") return raw ? "pass" : "fail";
  if (raw == null) return "fail";
  const s = String(raw).trim().toLowerCase();
  const passTokens = new Set(["pass", "passed", "success", "completed", "true", "ok", "passed!"]);
  if (passTokens.has(s)) return "pass";
  return "fail";
};

const clamp = (v: number, min = 0, max = 10) => Math.max(min, Math.min(max, Number.isFinite(v) ? v : min));

/* -------------------- Component -------------------- */

const FinalResults: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const state = (location.state || {}) as { allResults?: RawResult[]; studentId?: string | number };
  const { allResults = [], studentId } = state;

  const [loading, setLoading] = useState(true);
  const [backendScore, setBackendScore] = useState<number | null>(null);

  // Fetch actual score from backend (same as leaderboard)
  useEffect(() => {
    const fetchActualScore = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        const response = await fetch(`${backendUrl}/api/leaderboard`);

        if (!response.ok) {
          throw new Error('Failed to load leaderboard data');
        }

        const data = await response.json();

        // Get current user's email from localStorage (used during login/signup)
        const userEmail = localStorage.getItem('userEmail');

        if (!userEmail) {
          console.warn('No user email found in localStorage');
          setLoading(false);
          return;
        }

        // Search for current user in both leaderboards
        let userScore: StudentScore | undefined;

        // Check hard leaderboard first
        if (data.hard_leaderboard && Array.isArray(data.hard_leaderboard)) {
          userScore = data.hard_leaderboard.find((entry: StudentScore) =>
            entry.email.toLowerCase() === userEmail.toLowerCase()
          );
        }

        // If not found in hard, check medium leaderboard
        if (!userScore && data.medium_leaderboard && Array.isArray(data.medium_leaderboard)) {
          userScore = data.medium_leaderboard.find((entry: StudentScore) =>
            entry.email.toLowerCase() === userEmail.toLowerCase()
          );
        }

        if (userScore) {
          console.log('Found user score from backend:', userScore.total_score);
          setBackendScore(userScore.total_score);
        } else {
          console.warn('User not found in leaderboard. Email:', userEmail);
        }

        setLoading(false);
      } catch (error: any) {
        console.error('Error fetching actual score:', error);
        toast({
          title: "Warning",
          description: "Could not fetch updated score from server. Showing local results.",
          variant: "default"
        });
        setLoading(false);
      }
    };

    fetchActualScore();
  }, [toast]);

  // Normalize & filter relevant levels (easy/medium/hard)
  const normalized: NormalizedItem[] = useMemo(() => {
    if (!Array.isArray(allResults)) return [];

    return allResults
      .map((r) => {
        try {
          const level = normalizeLevel(r?.level);
          if (!level) return null;

          const result = normalizeResult(r?.result);
          const score = clamp(typeof r?.score === "number" ? r.score : 0);
          const criteria = r?.criteria && typeof r.criteria === "object" ? r.criteria : {};

          return { level, result, score, criteria } as NormalizedItem;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as NormalizedItem[];
  }, [allResults]);

  // Convenience map for quick lookup
  const byLevel = useMemo(() => {
    const map: Partial<Record<LevelName, NormalizedItem>> = {};
    normalized.forEach((item) => (map[item.level] = item));
    return map;
  }, [normalized]);

  // Level statuses
  const levelStatusText = (lvl: LevelName) => {
    const it = byLevel[lvl];
    if (!it) return "Not Attempted";
    return it.result === "pass" ? "Passed" : "Failed";
  };

  const easyStatus = levelStatusText("easy");
  const mediumStatus = levelStatusText("medium");
  const hardStatus = levelStatusText("hard");

  // Pass rule: medium must be passed
  const isPassed = byLevel["medium"]?.result === "pass";

  // Calculate average from state data (fallback only)
  const presentLevels = normalized.length;
  const totalScore = normalized.reduce((s, r) => s + r.score, 0);
  const calculatedAvgScore = presentLevels ? totalScore / presentLevels : 0;

  // CRITICAL: Always prioritize backend score (matches leaderboard)
  // Only use calculated score if backend fetch failed
  const displayScore = backendScore !== null ? backendScore : calculatedAvgScore;

  // Log for debugging
  React.useEffect(() => {
    console.log('Score Debug:', {
      backendScore,
      calculatedAvgScore,
      displayScore,
      usingBackend: backendScore !== null
    });
  }, [backendScore, calculatedAvgScore, displayScore]);

  // Aggregate criteria (averaged across present levels)
  const criteriaKeys = ["Relevance", "Clarity", "SubjectUnderstanding", "Accuracy", "Completeness", "CriticalThinking"];
  const aggregateCriteria: Record<string, number> = {};
  criteriaKeys.forEach((k) => {
    const sum = normalized.reduce((acc, r) => acc + (typeof r.criteria?.[k] === "number" ? (r.criteria![k] as number) : 0), 0);
    aggregateCriteria[k] = presentLevels ? sum / presentLevels : 0;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  /* -------------------- Render -------------------- */

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-100 dark:from-slate-900 dark:to-slate-800 p-4 md:p-8 transition-colors duration-300">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
      </div>

      <div className="absolute top-4 right-4 z-50">
        <ModeToggle />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Status Banner */}
        <div className={`rounded-2xl p-6 mb-8 shadow-xl ${isPassed
            ? "bg-gradient-to-r from-green-500 to-emerald-600"
            : "bg-gradient-to-r from-red-500 to-pink-600"
          }`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                {isPassed ? (
                  <Trophy className="w-8 h-8 text-white" />
                ) : (
                  <XCircle className="w-8 h-8 text-white" />
                )}
              </div>
              <div className="text-center md:text-left">
                <h2 className="text-white text-2xl font-bold mb-1">
                  {isPassed ? "Congratulations! You Passed!" : "Test Not Passed"}
                </h2>
                <p className="text-white/90">
                  {isPassed ? "All requirements successfully met" : "Requirements not met, please try again"}
                </p>
              </div>
            </div>
            {isPassed ? (
              <CheckCircle2 className="w-12 h-12 text-white opacity-80" />
            ) : (
              <XCircle className="w-12 h-12 text-white opacity-80" />
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Score Card */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 transition-colors duration-300">
            <h3 className="text-gray-900 dark:text-white mb-6 flex items-center gap-2 text-xl font-semibold">
              <Trophy className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              Your Performance
            </h3>

            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-2xl p-8 mb-6">
              <div className="text-center mb-6">
                <p className="text-gray-600 dark:text-gray-400 mb-3 font-medium">Average Score</p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-teal-600 dark:text-teal-400 font-bold" style={{ fontSize: '4.5rem', lineHeight: 1 }}>
                    {displayScore.toFixed(2)}
                  </span>
                  <span className="text-gray-400 dark:text-gray-600" style={{ fontSize: '2rem' }}>/</span>
                  <span className="text-gray-600 dark:text-gray-400" style={{ fontSize: '2rem' }}>10.0</span>
                </div>
                <div className="mt-4 inline-block px-6 py-2 bg-teal-600 text-white rounded-full font-medium">
                  {(displayScore * 10).toFixed(1)}% Overall
                </div>
              </div>
            </div>

            {/* Difficulty Breakdown */}
            <div className="space-y-4">
              {[
                { label: 'Easy Questions', level: 'easy' as LevelName, color: 'bg-green-500' },
                { label: 'Medium Questions', level: 'medium' as LevelName, color: 'bg-blue-500' },
                { label: 'Hard Questions', level: 'hard' as LevelName, color: 'bg-purple-500' },
              ].map((item, index) => {
                const levelData = byLevel[item.level];
                const score = levelData?.score || 0;
                const isAttempted = !!levelData;

                return (
                  <div key={index} className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 transition-colors duration-300">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-gray-700 dark:text-gray-300 font-medium">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900 dark:text-white font-bold">
                          {isAttempted ? `${score.toFixed(1)}/10` : "Not Attempted"}
                        </span>
                        {isAttempted && (
                          score >= 6 ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
                          )
                        )}
                      </div>
                    </div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all duration-1000`}
                        style={{ width: `${(score / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Side Info Cards */}
          <div className="space-y-6">
            {/* Stats Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 transition-colors duration-300">
              <h3 className="text-gray-900 dark:text-white mb-4 text-lg font-semibold">Quick Stats</h3>
              <div className="space-y-4">
                {[
                  { label: 'Status', value: isPassed ? 'Passed' : 'Not Passed' },
                  { label: 'Levels Completed', value: `${presentLevels}/3` },
                  { label: 'Accuracy', value: `${(displayScore * 10).toFixed(1)}%` },
                ].map((stat, index) => (
                  <div key={index} className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 last:border-0 pb-3 last:pb-0">
                    <span className="text-gray-600 dark:text-gray-400">{stat.label}</span>
                    <span className="text-gray-900 dark:text-white font-medium">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Achievement/Info Card */}
            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl shadow-xl p-6 text-white">
              <Trophy className="w-12 h-12 mb-4 text-white" />
              <h3 className="text-white mb-2 font-bold text-lg">Performance Summary</h3>
              <p className="text-yellow-100">
                {isPassed
                  ? "You have demonstrated excellent understanding across the evaluated difficulty levels."
                  : "Keep practicing! Focus on the levels where you scored below the passing threshold."}
              </p>
            </div>
          </div>
        </div>

        {/* Message Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 mb-6 transition-colors duration-300">
          <h3 className="text-gray-900 dark:text-white mb-3 text-xl font-semibold">What's Next?</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
            {isPassed
              ? "Exceptional work! You've successfully completed the medium level which is required to pass. Our team will review your application and contact you with next steps."
              : "You need to pass the medium level to be considered successful. Review which level(s) show as failed and try again."}
          </p>
          <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-medium">
            <CheckCircle2 className="w-5 h-5" />
            <span>Your results have been saved</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate("/", { state: { studentId } })}
            className="px-6 py-4 bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 rounded-xl hover:border-teal-500 dark:hover:border-teal-500 transition-all flex items-center justify-center gap-2 text-gray-700 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 shadow-lg"
          >
            <Home className="w-5 h-5" />
            <span>Back to Home</span>
          </button>
          <button
            onClick={() => navigate("/levels", { state: { studentId, fromResults: true } })}
            className="px-6 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl hover:shadow-xl transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <Trophy className="w-5 h-5" />
            <span>Detailed Analysis</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinalResults;