import { ModeToggle } from "@/components/mode-toggle";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Atom, Calculator, CheckCircle2, FlaskConical, Home, Trophy, XCircle } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * FinalResults component (Redesigned for Multi-Subject)
 * - Fetches all results for the student.
 * - Groups by Subject (Math, Physics, Chemistry).
 * - Calulates aggregate score (Out of 30).
 * - Displays per-subject breakdown.
 */

/* -------------------- Types -------------------- */
type LevelName = "easy" | "medium" | "hard";
type SubjectName = "math" | "physics" | "chemistry";
type NormalizedResult = "pass" | "fail" | "pending";

interface RawResult {
  id: string;
  subject?: string;
  level?: string;
  result?: string | boolean;
  score?: number;
  concession?: number;
  created_at: string;
  [key: string]: any;
}

interface ProcessedSubject {
  name: SubjectName;
  displayName: string;
  icon: any;
  score: number; // Out of 10
  status: "passed" | "failed" | "in_progress" | "not_started";
  levels: {
    easy: { status: NormalizedResult; score: number };
    medium: { status: NormalizedResult; score: number };
    hard: { status: NormalizedResult; score: number };
  };
}

/* -------------------- Helpers -------------------- */

const normalizeSubject = (raw?: string): SubjectName => {
  const s = String(raw || "math").trim().toLowerCase();
  if (s.includes("phys")) return "physics";
  if (s.includes("chem")) return "chemistry";
  return "math"; // Default or fallback
};

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
  if (!raw) return "fail";
  const s = String(raw).trim().toLowerCase();
  if (["pass", "passed", "success", "true"].includes(s)) return "pass";
  if (["pending"].includes(s)) return "pending";
  return "fail";
};

/* -------------------- Component -------------------- */

const FinalResults: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Navigation State
  const state = (location.state || {}) as { studentId?: string | number };
  const { studentId } = state;

  // Local Data State
  const [allResults, setAllResults] = useState<RawResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [concession, setConcession] = useState<number>(0);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      const idToFetch = studentId ? String(studentId) : sessionStorage.getItem('studentId');
      if (!idToFetch) {
        console.warn("No student ID found");
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("results")
          .select("*")
          .eq("student_id", idToFetch)
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (data) {
          setAllResults(data);
          // Check for concession in latest valid entry
          const latestWithConcession = data.find((r: any) => (r as any).concession !== null && (r as any).concession !== undefined);
          if (latestWithConcession) {
            setConcession((latestWithConcession as any).concession);
          }
        }
      } catch (err) {
        console.error("Error fetching results:", err);
        toast({ title: "Error", description: "Failed to load results.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [studentId, toast]);

  // Process Data
  const processedData = useMemo(() => {
    const subjects: Record<SubjectName, ProcessedSubject> = {
      math: {
        name: "math",
        displayName: "Mathematics",
        icon: Calculator,
        score: 0,
        status: "not_started",
        levels: { easy: { status: "fail", score: 0 }, medium: { status: "fail", score: 0 }, hard: { status: "fail", score: 0 } }
      },
      physics: {
        name: "physics",
        displayName: "Physics",
        icon: Atom,
        score: 0,
        status: "not_started",
        levels: { easy: { status: "fail", score: 0 }, medium: { status: "fail", score: 0 }, hard: { status: "fail", score: 0 } }
      },
      chemistry: {
        name: "chemistry",
        displayName: "Chemistry",
        icon: FlaskConical,
        score: 0,
        status: "not_started",
        levels: { easy: { status: "fail", score: 0 }, medium: { status: "fail", score: 0 }, hard: { status: "fail", score: 0 } }
      }
    };

    // Iterate results to populate subjects
    // We want the BEST result for each level/subject combo? Or LATEST?
    // Usually standardized tests take the best attempt if retakes allowed.
    // Let's assume we want to show the current "State".
    // We'll process oldest to newest to let later attempts overwrite?
    // Actually, `allResults` is DESC (newest first).
    // Let's iterate all and pick the one that is 'pass' if available, otherwise latest.

    // Group by key: "subject-level"
    const bestAttempts: Record<string, RawResult> = {};

    [...allResults].reverse().forEach(r => {
      const subj = normalizeSubject(r.subject);
      const lvl = normalizeLevel(r.level);
      if (!lvl) return;

      const key = `${subj}-${lvl}`;

      // Logic: If we already have a pass, keep it. If not, overwrite with this one (assuming this is newer because we reversed list? No, we reversed so we are iterating oldest -> newest).
      // So simple overwrite works: Newer replaces older.
      // EXCEPTION: If older was PASS and newer is FAIL? (Regression). 
      // Usually you keep the PASS.

      const currentBest = bestAttempts[key];
      const isPass = normalizeResult(r.result) === "pass";

      if (!currentBest) {
        bestAttempts[key] = r;
      } else {
        const currentIsPass = normalizeResult(currentBest.result) === "pass";
        if (isPass || !currentIsPass) {
          bestAttempts[key] = r;
        }
      }
    });

    // Translate to ProcessedSubject
    (Object.keys(subjects) as SubjectName[]).forEach(subjKey => {
      const subj = subjects[subjKey];
      let totalLevelsPassed = 0;
      let totalScoreSum = 0;

      (['easy', 'medium', 'hard'] as LevelName[]).forEach(lvl => {
        const raw = bestAttempts[`${subjKey}-${lvl}`];
        if (raw) {
          const status = normalizeResult(raw.result);
          // Score: Normalize to 10
          let sc = typeof raw.score === 'number' ? raw.score : 0;
          if (sc > 10) sc = sc / 10;

          subj.levels[lvl] = { status: status === 'pending' ? 'fail' : status, score: sc }; // Treat pending as fail for final results? Or incomplete.

          if (status === 'pass') totalLevelsPassed++;
          totalScoreSum += sc;

          if (subj.status === 'not_started') subj.status = 'in_progress';
        }
      });

      // Subject Score Calculation
      // Option 1: Average of attempted levels? 
      // Option 2: Average of ALL 3 levels (penalize not reaching hard)?
      // If we want total out of 30, each subject must be out of 10.
      // If I only passed Easy (10/10), is my subject score 10? Or 3.33?
      // Usually admission tests require completing all levels.
      // Let's go with: Average of ALL 3 levels (treating unattempted as 0).
      subj.score = totalScoreSum / 3;

      // Subject Status
      // New Rule: Pass if Medium OR Hard is passed.
      const mediumPassed = subj.levels.medium.status === 'pass';
      const hardPassed = subj.levels.hard.status === 'pass';

      if (mediumPassed || hardPassed) {
        subj.status = 'passed';
      } else if (totalLevelsPassed > 0) {
        subj.status = 'in_progress';
      }
    });

    return Object.values(subjects);
  }, [allResults]);

  // Overall Stats
  const totalScore = processedData.reduce((acc, s) => acc + s.score, 0); // Max 30
  // Pass Criteria: ALL 3 Subjects must be PASSED (At least Medium level passed)
  const isOverallPass = processedData.every(s => s.status === 'passed');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 font-sans transition-colors duration-300">
      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="absolute top-4 right-4 z-50">
        <ModeToggle />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">

        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white tracking-tight">
            Test <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-blue-500">Results</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Comprehensive performance analysis across all subjects
          </p>
        </div>

        {/* Global Status Banner */}
        <div className={`rounded-2xl p-8 mb-12 shadow-xl relative overflow-hidden ${isOverallPass
          ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
          : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
          }`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-inner ${isOverallPass ? "bg-white/20 backdrop-blur-md" : "bg-slate-100 dark:bg-slate-800"
                }`}>
                {isOverallPass ? <Trophy className="w-10 h-10 text-white" /> : <XCircle className="w-10 h-10 text-rose-500" />}
              </div>
              <div className="text-center md:text-left">
                <h2 className={`text-3xl font-bold mb-2 ${isOverallPass ? "text-white" : "text-slate-900 dark:text-white"}`}>
                  {isOverallPass ? "Excellent! You Passed!" : "Test Outcome: Not Passed"}
                </h2>
                <p className={`text-lg opacity-90 ${isOverallPass ? "text-emerald-50" : "text-slate-600 dark:text-slate-400"}`}>
                  {isOverallPass
                    ? "You have successfully cleared the admission criteria."
                    : "To pass, you must complete at least the Medium level in all 3 subjects."}
                </p>


                {concession > 0 && (
                  <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-yellow-400/20 backdrop-blur-md border border-yellow-400/30 rounded-full">
                    <span className="text-xl">✨</span>
                    <span className="font-bold text-yellow-700 dark:text-yellow-300">
                      {concession}% Scholarship Awarded
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Overall Score Circle */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <svg className="w-40 h-40 transform -rotate-90">
                  <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="10" fill="transparent" className={`${isOverallPass ? "text-white/20" : "text-slate-200 dark:text-slate-800"}`} />
                  <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray={440} strokeDashoffset={440 - (440 * totalScore) / 30} className={`${isOverallPass ? "text-white" : "text-blue-500"}`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-4xl font-bold ${isOverallPass ? "text-white" : "text-slate-900 dark:text-white"}`}>
                    {totalScore.toFixed(1)}
                  </span>
                  <span className={`text-sm font-medium uppercase ${isOverallPass ? "text-white/80" : "text-slate-500"}`}>
                    Out of 30
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subjects Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {processedData.map((subject) => {
            const Icon = subject.icon;
            const isPassed = subject.status === 'passed';

            // Color themes per subject
            const colors = {
              math: { bg: "bg-emerald-50 dark:bg-emerald-900/10", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" },
              physics: { bg: "bg-blue-50 dark:bg-blue-900/10", border: "border-blue-200 dark:border-blue-800", text: "text-blue-600 dark:text-blue-400", bar: "bg-blue-500" },
              chemistry: { bg: "bg-purple-50 dark:bg-purple-900/10", border: "border-purple-200 dark:border-purple-800", text: "text-purple-600 dark:text-purple-400", bar: "bg-purple-500" }
            }[subject.name];

            return (
              <div key={subject.name} className={`bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg border ${colors.border} flex flex-col`}>

                {/* Subject Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${colors.bg}`}>
                      <Icon className={`w-6 h-6 ${colors.text}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white">{subject.displayName}</h3>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{isPassed ? "Completed" : "Incomplete"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-2xl font-bold text-slate-900 dark:text-white">{subject.score.toFixed(1)}</span>
                    <span className="text-xs text-slate-500">/ 10.0</span>
                  </div>
                </div>

                {/* Levels List */}
                <div className="space-y-4 flex-grow">
                  {(['easy', 'medium', 'hard'] as LevelName[]).map((lvl) => {
                    const data = subject.levels[lvl];
                    const isLvlPass = data.status === 'pass';
                    const isLvlFail = data.status === 'fail';
                    const scorePct = (data.score / 10) * 100;

                    return (
                      <div key={lvl} className="">
                        <div className="flex justify-between items-center mb-1 text-sm">
                          <span className="capitalize text-slate-700 dark:text-slate-300 font-medium">{lvl}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-900 dark:text-white font-bold">{data.score > 0 ? data.score.toFixed(1) : "-"}</span>
                            {isLvlPass && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                            {isLvlFail && data.score > 0 && <XCircle className="w-4 h-4 text-rose-500" />}
                            {data.score === 0 && <div className="w-4 h-4 rounded-full border-2 border-slate-200 dark:border-slate-700" />}
                          </div>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isLvlPass ? colors.bar : "bg-slate-300 dark:bg-slate-600"}`}
                            style={{ width: `${scorePct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Subject Footer Status */}
                <div className={`mt-6 p-3 rounded-lg text-center text-sm font-medium ${isPassed
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}>
                  {isPassed ? "Subject Cleared" : "Requirements Not Met"}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          <button
            onClick={() => navigate("/", { state: { studentId } })}
            className="px-6 py-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:border-emerald-500 dark:hover:border-emerald-500 transition-all flex items-center justify-center gap-2 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 shadow-lg group"
          >
            <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>Return Home</span>
          </button>
          <button
            onClick={() => {
              // Decide where to go. If passed, maybe just stay? If failed, go to levels to retry.
              navigate("/levels", { state: { studentId, fromResults: true } });
            }}
            className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-blue-600 text-white rounded-xl hover:shadow-xl transition-all flex items-center justify-center gap-2 shadow-lg group"
          >
            <Trophy className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>{isOverallPass ? "View Analysis" : "Retry Failed Subjects"}</span>
          </button>
        </div>

      </div>
    </div >
  );
};

export default FinalResults;