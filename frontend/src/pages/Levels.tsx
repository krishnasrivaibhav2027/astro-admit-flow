import { ModeToggle } from "@/components/mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { auth } from "@/config/firebase";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sendPasswordResetEmail } from "firebase/auth";
import { CheckCircle2, Crown, KeyRound, Lock, LogOut, Target, Trophy, User, Zap } from "lucide-react";
import { useEffect, useState } from "react";
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
  const fromResults = location.state?.fromResults; // Check if coming from Results page
  const [levels, setLevels] = useState<LevelData[]>([
    {
      level: "easy",
      title: "Easy Level",
      icon: Target,
      color: "from-green-500 to-emerald-500",
      description: "Foundation concepts - 5 questions",
      status: "current",
      attempts: 0,
      maxAttempts: 1
    },
    {
      level: "medium",
      title: "Medium Level",
      icon: Zap,
      color: "from-blue-500 to-cyan-500",
      description: "Intermediate concepts - 3 questions",
      status: "locked",
      attempts: 0,
      maxAttempts: 2
    },
    {
      level: "hard",
      title: "Hard Level",
      icon: Crown,
      color: "from-purple-500 to-pink-500",
      description: "Advanced concepts - 2 questions",
      status: "locked",
      attempts: 0,
      maxAttempts: 2
    }
  ]);
  const [testCompleted, setTestCompleted] = useState(false);
  const [latestResultData, setLatestResultData] = useState<any>(null);

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        // Check if user is authenticated using sessionStorage (custom auth)
        const storedStudentId = sessionStorage.getItem('studentId');
        const currentStudentId = studentId || storedStudentId;
        
        if (!currentStudentId) {
          console.log("No student ID found, redirecting to login");
          navigate("/login");
          return;
        }

        console.log("Student authenticated:", currentStudentId);
        loadProgress(currentStudentId);
      } catch (error) {
        console.error("Error checking auth:", error);
        navigate("/login");
      }
    };

    checkAuthAndLoadData();
  }, [studentId]);

  const loadProgress = async (currentStudentId: string) => {
    if (!currentStudentId) {
      navigate("/login");
      return;
    }

    const { data } = await supabase
      .from("results")
      .select("*")
      .eq("student_id", currentStudentId)
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      const latestResult = data[0];
      
      // Check pass status for each level
      const easyPassed = data.some(r => r.level === "easy" && r.result === "pass");
      const mediumPassed = data.some(r => r.level === "medium" && r.result === "pass");
      const hardPassed = data.some(r => r.level === "hard" && r.result === "pass");
      
      // Get attempt counts from latest result
      const easyAttempts = latestResult.attempts_easy || 0;
      const mediumAttempts = latestResult.attempts_medium || 0;
      const hardAttempts = latestResult.attempts_hard || 0;
      
      // Update level statuses FIRST - This is the PRIMARY function
      const newLevels = [...levels];
      newLevels[0].attempts = easyAttempts;
      newLevels[1].attempts = mediumAttempts;
      newLevels[2].attempts = hardAttempts;
      
      // SIMPLIFIED LOGIC: Set level statuses based on pass/fail ONLY
      // Easy Level
      if (easyPassed || easyAttempts >= 1) {
        newLevels[0].status = "completed";
      } else {
        newLevels[0].status = "current";
      }
      
      // Medium Level - UNLOCKS when Easy is PASSED
      if (mediumPassed || (easyPassed && mediumAttempts >= 2)) {
        newLevels[1].status = "completed";
      } else if (easyPassed) {
        newLevels[1].status = "current"; // KEY FIX: Unlock when Easy passed
      } else {
        newLevels[1].status = "locked";
      }
      
      // Hard Level - UNLOCKS when Medium is PASSED
      if (hardPassed || (mediumPassed && hardAttempts >= 2)) {
        newLevels[2].status = "completed";
      } else if (mediumPassed) {
        newLevels[2].status = "current"; // Unlock when Medium passed
      } else {
        newLevels[2].status = "locked";
      }
      
      // Update levels state IMMEDIATELY
      setLevels(newLevels);
      
      // Determine if ENTIRE test sequence is complete
      // ONLY true when ALL 3 levels are passed
      const allThreeLevelsPassed = easyPassed && mediumPassed && hardPassed;
      
      // OR when failed a level and exhausted all attempts (cannot continue)
      const easyFailedCompletely = easyAttempts >= 1 && !easyPassed;
      const mediumFailedCompletely = easyPassed && mediumAttempts >= 2 && !mediumPassed;
      const hardFailedCompletely = mediumPassed && hardAttempts >= 2 && !hardPassed;
      
      const testFullyComplete = allThreeLevelsPassed || easyFailedCompletely || mediumFailedCompletely || hardFailedCompletely;
      
      console.log("🔍 DEBUG:", {
        easyPassed, mediumPassed, hardPassed,
        easyAttempts, mediumAttempts, hardAttempts,
        testFullyComplete,
        mediumStatus: newLevels[1].status
      });
      
      // Set test completion state
      setTestCompleted(testFullyComplete);
      
      // Set result data only if test is fully complete
      if (testFullyComplete) {
        setLatestResultData(latestResult);
      } else {
        setLatestResultData(null);
      }
      
      // NO AUTO-REDIRECTS - User clicks "Go to Results" button when ready
      // Level statuses are already set above
    }
  };

  const handleStartLevel = (level: LevelData) => {
    // Don't allow starting locked or completed levels
    if (level.status === "locked" || level.status === "completed") return;
    
    navigate("/test", { 
      state: { 
        studentId, 
        level: level.level,
        currentAttempt: level.attempts + 1
      } 
    });
  };

  const handleLogout = () => {
    // Clear all authentication data
    localStorage.removeItem('firebase_token');
    sessionStorage.removeItem('studentId');
    sessionStorage.removeItem('studentEmail');
    
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    
    // Navigate to home page
    navigate("/");
  };

  const handleChangePassword = async () => {
    try {
      const email = sessionStorage.getItem('studentEmail');
      if (!email) {
        toast({
          title: "Error",
          description: "Email not found. Please log in again.",
          variant: "destructive"
        });
        return;
      }

      await sendPasswordResetEmail(auth, email);

      toast({
        title: "Password Reset Email Sent!",
        description: "Please check your email to reset your password.",
      });
    } catch (error: any) {
      console.error('Error sending password reset:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send password reset email.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-purple-50 to-blue-50 dark:from-background dark:via-purple-950/20 dark:to-blue-950/20" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

      {/* Leaderboard Button - Top Left */}
      <div className="absolute top-4 left-4 z-50">
        <Button
          variant="outline"
          size="lg"
          onClick={() => navigate("/leaderboard")}
          className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 hover:from-yellow-600 hover:to-orange-600"
        >
          <Trophy className="w-5 h-5 mr-2" />
          Leaderboard
        </Button>
      </div>

      {/* Theme Toggle, Account Menu, and Logout */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="bg-background/80 backdrop-blur-sm"
              title="Account"
            >
              <User className="h-[1.2rem] w-[1.2rem]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleChangePassword} className="cursor-pointer">
              <KeyRound className="mr-2 h-4 w-4" />
              <span>Change Password</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="outline"
          size="icon"
          onClick={handleLogout}
          className="bg-background/80 backdrop-blur-sm"
          title="Logout"
        >
          <LogOut className="h-[1.2rem] w-[1.2rem]" />
        </Button>
        <ModeToggle />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">
              Test <span className="gradient-text">Levels</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Progress through each level to complete your admission test
            </p>
          </div>

          {/* Go to Results Button - Only shown when test is completed */}
          {testCompleted && (
            <div className="mb-6">
              <Card className="border-2 border-primary bg-gradient-to-r from-primary/10 to-purple-500/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold mb-1">Test Completed! 🎉</h3>
                      <p className="text-muted-foreground">
                        View your final results and performance summary
                      </p>
                    </div>
                    <Button
                      size="lg"
                      variant="glow"
                      onClick={async () => {
                        // Fetch all results for this student
                        const studentId = sessionStorage.getItem('studentId');
                        const { data: allResults } = await supabase
                          .from("results")
                          .select("*")
                          .eq("student_id", studentId)
                          .order("created_at", { ascending: true });
                        // Check if medium is passed
                        const mediumPassed = allResults?.find(r => r.level === "medium" && r.result === "pass");
                        // If medium is passed, allow test as passed, else not passed
                        // Pass allResults to FinalResults for correct UI
                        navigate("/final-results", {
                          state: {
                            studentId,
                            allResults: allResults?.filter(r => ["easy","medium","hard"].includes(r.level)) || []
                          }
                        });
                      }}
                    >
                      <Trophy className="w-5 h-5 mr-2" />
                      Go to Results
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="space-y-6">
            {levels.map((level, index) => {
              const Icon = level.icon;
              const isLocked = level.status === "locked";
              const isCompleted = level.status === "completed";
              const isCurrent = level.status === "current";

              return (
                <Card 
                  key={level.level}
                  className={`
                    border-2 transition-all duration-300 overflow-hidden
                    ${isLocked ? "opacity-60" : "hover:shadow-xl hover:-translate-y-1"}
                    ${isCurrent ? "border-primary glow-effect" : ""}
                    ${isCompleted ? "border-green-500" : ""}
                  `}
                  style={{
                    animationDelay: `${index * 0.1}s`
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6 flex-1">
                        <div className={`
                          w-16 h-16 rounded-2xl bg-gradient-to-br ${level.color} 
                          flex items-center justify-center relative
                          ${isCurrent ? "animate-glow-pulse" : ""}
                        `}>
                          {isLocked ? (
                            <Lock className="w-8 h-8 text-white" />
                          ) : isCompleted ? (
                            <CheckCircle2 className="w-8 h-8 text-white" />
                          ) : (
                            <Icon className="w-8 h-8 text-white" />
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-2xl font-bold">{level.title}</h3>
                            {isCompleted && (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                                Completed
                              </Badge>
                            )}
                            {isCurrent && (
                              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                                Current
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground mb-2">{level.description}</p>
                          <div className="text-sm text-muted-foreground">
                            Attempts: {level.attempts} / {level.maxAttempts}
                          </div>
                        </div>
                      </div>

                      {/* Button Logic:
                          - If level is completed (has attempts) → Show "Review" button
                          - If level is current and not attempted → Show "Start Test" button
                          - If level is locked → Show "Locked" button
                      */}
                      {(isCompleted || level.attempts > 0) ? (
                        <Button
                          size="lg"
                          variant="secondary"
                          onClick={() => navigate(`/review/${level.level}`)}
                          className="ml-4"
                        >
                          Review
                        </Button>
                      ) : (
                        <Button
                          size="lg"
                          variant={isCurrent ? "glow" : "outline"}
                          disabled={isLocked}
                          onClick={() => handleStartLevel(level)}
                          className="ml-4"
                        >
                          {isLocked ? (
                            <>
                              <Lock className="w-4 h-4 mr-2" />
                              Locked
                            </>
                          ) : (
                            "Start Test"
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-12 p-6 rounded-xl bg-card border-2">
            <h3 className="text-lg font-semibold mb-3">Test Guidelines</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Each level must be passed to unlock the next</li>
              <li>• You need a minimum score of 5.0/10 to pass</li>
              <li>• Easy level: 1 attempt only</li>
              <li>• Medium & Hard levels: 2 attempts maximum</li>
              <li>• Your answers will be evaluated on multiple criteria</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Levels;
