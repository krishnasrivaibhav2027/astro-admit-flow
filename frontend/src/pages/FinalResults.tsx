// FinalResults.tsx
import { ModeToggle } from "@/components/mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-purple-50 to-blue-50 dark:from-background dark:via-purple-950/20 dark:to-blue-950/20" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <div className="absolute top-4 right-4 z-50">
        <ModeToggle />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
          <Card className={`border-4 shadow-elevated ${isPassed ? "border-green-500" : "border-red-500"}`}>
            <CardContent className="p-12 text-center space-y-6">
              <div
                className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${
                  isPassed ? "bg-gradient-to-br from-green-500 to-emerald-500" : "bg-gradient-to-br from-red-500 to-pink-500"
                } animate-scale-in glow-effect`}
              >
                {isPassed ? <Trophy className="w-12 h-12 text-white" /> : <XCircle className="w-12 h-12 text-white" />}
              </div>

              <div>
                <h1 className="text-4xl font-bold mb-2">
                  {isPassed ? (
                    <>
                      Congratulations! <span className="gradient-text">You Passed!</span>
                    </>
                  ) : (
                    <>
                      Test <span className="gradient-text">Not Passed</span>
                    </>
                  )}
                </h1>
                <p className="text-xl text-muted-foreground">Admission Test Results</p>
              </div>

              <div className="inline-flex items-center gap-4 px-8 py-4 rounded-2xl bg-muted/50 border-2">
                <div className="text-left">
                  <p className="text-sm text-muted-foreground mb-1">Your Average Score</p>
                  <p className="text-5xl font-bold gradient-text">{displayScore.toFixed(2)}</p>
                </div>
                <div className="text-6xl text-muted-foreground">/</div>
                <div className="text-left">
                  <p className="text-sm text-muted-foreground mb-1">Out of</p>
                  <p className="text-5xl font-bold">10.0</p>
                </div>
              </div>

              <Progress value={Math.max(0, Math.min(100, (displayScore / 10) * 100))} className="h-3" />

              <div className="flex justify-center gap-4 mt-4">
                <div>
                  <span className="font-semibold">Easy:</span>{" "}
                  {easyStatus === "Passed" ? <span className="text-green-600">Passed</span> : easyStatus === "Not Attempted" ? <span className="text-gray-500">Not Attempted</span> : <span className="text-red-600">Failed</span>}
                </div>
                <div>
                  <span className="font-semibold">Medium:</span>{" "}
                  {mediumStatus === "Passed" ? <span className="text-green-600">Passed</span> : mediumStatus === "Not Attempted" ? <span className="text-gray-500">Not Attempted</span> : <span className="text-red-600">Failed</span>}
                </div>
                <div>
                  <span className="font-semibold">Hard:</span>{" "}
                  {hardStatus === "Passed" ? <span className="text-green-600">Passed</span> : hardStatus === "Not Attempted" ? <span className="text-gray-500">Not Attempted</span> : <span className="text-red-600">Failed</span>}
                </div>
              </div>

              {isPassed ? (
                <Badge className="text-lg px-6 py-2 bg-green-500 hover:bg-green-600">
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Passed
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-lg px-6 py-2">
                  <XCircle className="w-5 h-5 mr-2" />
                  Not Passed
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Feedback / guidance card */}
          <Card className="border-2 bg-card/50 backdrop-blur">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-3">{isPassed ? "Great Job!" : "Keep Trying!"}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {isPassed
                  ? "Exceptional work! You've successfully completed the medium level which is required to pass. Our team will review your application and contact you with next steps."
                  : "You need to pass the medium level to be considered successful. Review which level(s) show as failed and try again."}
              </p>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" variant="outline" className="flex-1" onClick={() => navigate("/", { state: { studentId } })}>
              <Home className="w-5 h-5 mr-2" />
              Home
            </Button>

            <Button size="lg" variant="glow" className="flex-1" onClick={() => navigate("/levels", { state: { studentId, fromResults: true } })}>
              Detailed Analysis
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinalResults;