import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, Zap, Crown, Lock, CheckCircle2, LogOut, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ModeToggle } from "@/components/mode-toggle";
import { useToast } from "@/hooks/use-toast";

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
      
      // Check if test is completed (passed all levels OR failed completely)
      const easyPassed = data.some(r => r.level === "easy" && r.result === "pass");
      const mediumPassed = data.some(r => r.level === "medium" && r.result === "pass");
      const hardPassed = data.some(r => r.level === "hard" && r.result === "pass");
      
      const easyAttempts = latestResult.attempts_easy || 0;
      const mediumAttempts = latestResult.attempts_medium || 0;
      const hardAttempts = latestResult.attempts_hard || 0;
      
      // Check if user completed all levels (passed all OR exhausted attempts)
      const allLevelsPassed = easyPassed && mediumPassed && hardPassed;
      
      // Check if user failed completely (exhausted all attempts without passing)
      const easyFailed = easyAttempts >= 1 && !easyPassed;
      const mediumFailed = mediumAttempts >= 2 && !mediumPassed;
      const hardFailed = hardAttempts >= 2 && !hardPassed;
      
      // If all levels passed, redirect to results with final score
      if (allLevelsPassed) {
        const hardResult = data.find(r => r.level === "hard" && r.result === "pass");
        if (hardResult) {
          toast({
            title: "Test Completed!",
            description: "All levels passed. Showing final results.",
          });
          
          navigate("/results", {
            state: {
              studentId: currentStudentId,
              score: hardResult.score || 0,
              result: "pass",
              level: "hard",
              criteria: {}, // You can fetch this if needed
              emailSent: true,
              completed: true
            }
          });
          return;
        }
      }
      
      // If failed at any level and exhausted attempts, show failure results
      if (easyFailed) {
        const easyResult = data.find(r => r.level === "easy" && r.result === "fail");
        if (easyResult) {
          toast({
            title: "Test Failed",
            description: "Failed at Easy level. Showing results.",
            variant: "destructive"
          });
          
          navigate("/results", {
            state: {
              studentId: currentStudentId,
              score: easyResult.score || 0,
              result: "fail",
              level: "easy",
              criteria: {},
              emailSent: true,
              completed: true
            }
          });
          return;
        }
      }
      
      if (mediumFailed && easyPassed) {
        const mediumResult = data.find(r => r.level === "medium" && r.result === "fail");
        if (mediumResult) {
          toast({
            title: "Test Failed",
            description: "Failed at Medium level. Showing results.",
            variant: "destructive"
          });
          
          navigate("/results", {
            state: {
              studentId: currentStudentId,
              score: mediumResult.score || 0,
              result: "fail",
              level: "medium",
              criteria: {},
              emailSent: true,
              completed: true
            }
          });
          return;
        }
      }
      
      if (hardFailed && mediumPassed) {
        // Even if hard failed but medium passed, overall pass
        const finalResult = data.find(r => r.level === "medium" && r.result === "pass");
        if (finalResult) {
          toast({
            title: "Test Completed!",
            description: "Medium level passed. Showing final results.",
          });
          
          navigate("/results", {
            state: {
              studentId: currentStudentId,
              score: finalResult.score || 0,
              result: "pass",
              level: "medium",
              criteria: {},
              emailSent: true,
              completed: true
            }
          });
          return;
        }
      }
      
      // If test is not completed, continue with normal level display
      const newLevels = [...levels];
      
      // Update attempts from latest result
      newLevels[0].attempts = latestResult.attempts_easy || 0;
      newLevels[1].attempts = latestResult.attempts_medium || 0;
      newLevels[2].attempts = latestResult.attempts_hard || 0;
      
      // Check individual level statuses
      const easyAttemptsExhausted = newLevels[0].attempts >= 1;
      const mediumAttemptsExhausted = newLevels[1].attempts >= 2;
      const hardAttemptsExhausted = newLevels[2].attempts >= 2;
      
      // Easy level
      if (easyPassed) {
        newLevels[0].status = "completed";
      } else if (easyAttemptsExhausted) {
        newLevels[0].status = "completed"; // Failed but exhausted attempts
      } else {
        newLevels[0].status = "current";
      }
      
      // Medium level
      if (mediumPassed) {
        newLevels[1].status = "completed";
      } else if (easyPassed && mediumAttemptsExhausted) {
        newLevels[1].status = "completed"; // Failed but exhausted attempts
      } else if (easyPassed) {
        newLevels[1].status = "current";
      } else {
        newLevels[1].status = "locked";
      }
      
      // Hard level
      if (hardPassed) {
        newLevels[2].status = "completed";
      } else if (mediumPassed && hardAttemptsExhausted) {
        newLevels[2].status = "completed"; // Failed but exhausted attempts
      } else if (mediumPassed) {
        newLevels[2].status = "current";
      } else {
        newLevels[2].status = "locked";
      }
      
      setLevels(newLevels);
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
    localStorage.removeItem('jwt_token');
    sessionStorage.removeItem('studentId');
    sessionStorage.removeItem('studentEmail');
    
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    
    // Navigate to home page
    navigate("/");
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-purple-50 to-blue-50 dark:from-background dark:via-purple-950/20 dark:to-blue-950/20" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

      {/* Theme Toggle, Profile, and Logout */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/profile")}
          className="bg-background/80 backdrop-blur-sm"
          title="Profile"
        >
          <User className="h-[1.2rem] w-[1.2rem]" />
        </Button>
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

                      <Button
                        size="lg"
                        variant={isCurrent ? "glow" : "outline"}
                        disabled={isLocked || isCompleted}
                        onClick={() => handleStartLevel(level)}
                        className="ml-4"
                      >
                        {isCompleted ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Completed
                          </>
                        ) : isLocked ? (
                          <>
                            <Lock className="w-4 h-4 mr-2" />
                            Locked
                          </>
                        ) : level.attempts >= level.maxAttempts ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Completed
                          </>
                        ) : (
                          "Start Test"
                        )}
                      </Button>
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
