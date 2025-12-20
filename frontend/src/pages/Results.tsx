
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Clock, Home, Mail, TrendingUp, Trophy, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const Results = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  // Initialize emailSent from backend response to prevent duplicates
  const { studentId, score = 0, result = '', result_status, level = 'easy', criteria = [], timeout, completed, global_status, email_sent } = location.state || {};
  const [currentAttempts, setCurrentAttempts] = useState<number>(0);
  const [maxAttempts, setMaxAttempts] = useState<number>(0);
  const [emailSent, setEmailSent] = useState<boolean>(!!email_sent); // Initialize with backend status
  const [sendingEmail, setSendingEmail] = useState<boolean>(false);
  const [isTestCompleted, setIsTestCompleted] = useState<boolean>(completed || false);

  useEffect(() => {
    const checkAuth = async () => {
      // Check authentication first
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const sessionStudentId = sessionStorage.getItem('studentId');

      if (!token || !sessionStudentId) {
        toast({
          title: "Authentication Required",
          description: "Please login to view results.",
          variant: "destructive"
        });
        navigate("/login");
        return;
      }
    };

    checkAuth();

    if (!studentId || score === undefined) {
      navigate("/levels");
      return;
    }
    loadAttemptData();
  }, [studentId, score]);

  // Prefer backend result_status, fallback to result, then to score threshold
  const passStatus = (typeof result_status === 'string' ? result_status : result) || '';
  const isPassed = passStatus.toLowerCase() === 'pass' || (passStatus === '' && typeof score === 'number' && score >= 6);


  const loadAttemptData = async () => {
    try {
      // Fetch Admin Settings for dynamic max attempts
      const { data: adminSettings } = await (supabase as any)
        .from("admin_settings")
        .select("setting_key, setting_value")
        .eq("setting_key", "max_attempts")
        .single();

      const dynamicMaxAttempts = adminSettings?.setting_value ? parseInt(adminSettings.setting_value) : 2;

      // Get ALL results to check comprehensive status for scholarships/notifications
      const { data: allResults } = await supabase
        .from("results")
        .select("*")
        .eq("student_id", studentId);

      if (allResults && allResults.length > 0) {
        // Find the specific result for this current session/subject/level
        // We can sort in memory to find latest
        allResults.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        const latestResult = allResults[0]; // Assuming the one we just finished is the latest

        const attemptsField = `attempts_${level}` as keyof typeof latestResult;
        const attempts = latestResult[attemptsField] as number || 0;
        setCurrentAttempts(attempts);

        // Set max attempts based on level (hardcoded here to match logic)
        const maxAttemptsByLevel = {
          easy: 1,
          medium: 2,
          hard: 2
        };
        const maxAttempts = maxAttemptsByLevel[level as keyof typeof maxAttemptsByLevel] || 2;
        setMaxAttempts(maxAttempts);

        // --- Logic to deciding if we should hit the email API ---
        // 1. Check if Max Attempts Reached for THIS level (on Failure)
        // User Requirement Update: Fail email sent for Easy AND Medium level failures.
        const isMaxFail = !isPassed && (level === 'easy' || level === 'medium') && attempts >= maxAttempts;

        // 2. Check if All Subjects Completed (Final Verdict Trigger)
        const subjects = ['math', 'physics', 'chemistry'];

        const isSubjectCompleted = (sub: string) => {
          const subResults = allResults.filter((r: any) => (r.subject || 'physics').toLowerCase() === sub);

          // Completed if:
          // 1. Passed Hard Level
          const passedHard = subResults.some((r: any) => r.level === 'hard' && r.result === 'pass');
          if (passedHard) return true;

          // 2. Or Failed Max Attempts at any level (and thus cannot proceed)
          // We need to check the LATEST attempt for the subject.
          const latestSubResult = subResults[0]; // Assuming sorted desc by created_at
          if (!latestSubResult) return false; // Not started

          const level = latestSubResult.level;
          const status = latestSubResult.result;
          const attempts = level === 'easy' ? (latestSubResult.attempts_easy || 0) :
            level === 'medium' ? (latestSubResult.attempts_medium || 0) :
              (latestSubResult.attempts_hard || 0);

          const max = level === 'easy' ? 1 :
            dynamicMaxAttempts; // Use fetched dynamic setting

          // If failed (not passed) and attempts >= max, then it's a dead end -> Completed.
          if (status !== 'pass' && attempts >= max) return true;

          return false;
        };

        // We check completion based on the *fetched* results, but we must also account for the CURRENT result
        // which might not be in 'allResults' yet if it was just created/updated? 
        // Note: loadAttemptData fetches 'allResults' fresh from DB, so it should include the current one.

        const allSubjectsCompleted = subjects.every(s => isSubjectCompleted(s));

        // 3. Only trigger if one of these is true
        // isMaxFail -> Immediate Fail Notification (Easy/Medium)
        // allSubjectsCompleted -> Final Verdict Notification
        // global_status -> Backend authoritative status (trust mechanism)
        if (isMaxFail || allSubjectsCompleted || global_status === 'completed' || global_status === 'failed') {
          await handleMaxAttemptsReached();
        } else {
          console.log("Skipping email API call: Criteria not met (Intermediate success or attempts remaining).");
        }
      }
    } catch (error) {
      console.error("Error loading attempt data:", error);
    }
  };

  const handleMaxAttemptsReached = async () => {
    if (emailSent || sendingEmail) return;

    setSendingEmail(true);
    try {
      // Get student data for email
      const { data: studentData } = await supabase
        .from("students")
        .select("*")
        .eq("id", studentId)
        .single();

      if (studentData) {
        // Get current user token

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          console.error("User not authenticated");
          return;
        }
        const token = session.access_token;

        // Send email notification via backend API
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        const response = await fetch(`${backendUrl}/api/send-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            to_email: studentData.email,
            student_name: `${studentData.first_name} ${studentData.last_name}`,
            result: "fail", // This is just a trigger, backend will calculate actual status
            score: score,
            student_id: studentId
          })
        });

        const data = await response.json();

        if (response.ok && data.email_sent) {
          setEmailSent(true);
          toast({
            title: "Email Sent",
            description: "A notification email has been sent regarding your test results.",
          });
        } else {
          // Email was skipped or failed
          console.log("Email notification status:", data.message);
          // Set to true anyway to prevent further attempts in this session
          setEmailSent(true);
        }
      }
    } catch (error) {
      console.error("Error sending email:", error);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleRetryLevel = () => {
    // Navigate directly to test with incremented attempt
    navigate("/test", {
      state: {
        studentId,
        level,
        currentAttempt: currentAttempts + 1
      }
    });
  };

  // Display 6 evaluation criteria (average scores across all questions)
  // Display 6 evaluation criteria (average scores across all questions)
  const evaluationCriteria = Array.isArray(criteria) ? criteria : (criteria ? [
    { name: "Relevance", score: criteria.Relevance || 0 },
    { name: "Clarity", score: criteria.Clarity || 0 },
    { name: "Subject Understanding", score: criteria.SubjectUnderstanding || 0 },
    { name: "Accuracy", score: criteria.Accuracy || 0 },
    { name: "Completeness", score: criteria.Completeness || 0 },
    { name: "Critical Thinking", score: criteria.CriticalThinking || 0 }
  ] : []);

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-blue-600";
    if (score >= 4) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 8) return "bg-green-500";
    if (score >= 6) return "bg-blue-500";
    if (score >= 4) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="min-h-screen relative overflow-hidden">

      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
          {/* Result Header */}
          <Card className={`border-4 shadow-elevated ${isPassed ? 'border-green-500' : 'border-red-500'}`}>
            <CardContent className="p-12 text-center space-y-6">
              <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${isPassed ? 'bg-gradient-to-br from-green-500 to-emerald-500' : 'bg-gradient-to-br from-red-500 to-pink-500'
                } animate-scale-in glow-effect`}>
                {isPassed ? (
                  <Trophy className="w-12 h-12 text-white" />
                ) : (
                  <XCircle className="w-12 h-12 text-white" />
                )}
              </div>

              <div>
                <h1 className="text-4xl font-bold mb-2">
                  {timeout ? (
                    <>Time's Up! <span className="gradient-text text-red-600 dark:text-red-400">Test Expired</span></>
                  ) : isPassed ? (
                    <>Congratulations! <span className="gradient-text">You Passed!</span></>
                  ) : (
                    <>Test <span className="gradient-text">Not Passed</span></>
                  )}
                </h1>
                <p className="text-xl text-muted-foreground">
                  {level.charAt(0).toUpperCase() + level.slice(1)} Level Results
                </p>
                {timeout && (
                  <Badge variant="destructive" className="mt-2">
                    <Clock className="w-3 h-3 mr-1" />
                    Time Limit Exceeded
                  </Badge>
                )}
              </div>

              <div className="inline-flex items-center gap-4 px-8 py-4 rounded-2xl bg-muted/50 border-2">
                <div className="text-left">
                  <p className="text-sm text-muted-foreground mb-1">Your Score</p>
                  <p className="text-5xl font-bold gradient-text">{score.toFixed(1)}</p>
                </div>
                <div className="text-6xl text-muted-foreground">/</div>
                <div className="text-left">
                  <p className="text-sm text-muted-foreground mb-1">Out of</p>
                  <p className="text-5xl font-bold">10.0</p>
                </div>
              </div>

              <Progress value={(score / 10) * 100} className="h-3" />

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

          {/* Detailed Scores */}
          <Card className="border-2 shadow-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-primary" />
                Detailed Evaluation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {evaluationCriteria.map((criterion: any, index: number) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{criterion.name}</span>
                    <span className={`text-lg font-bold ${getScoreColor(criterion.score)}`}>
                      {criterion.score.toFixed(1)} / 10
                    </span>
                  </div>
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 ${getScoreBg(criterion.score)} transition-all duration-1000`}
                      style={{
                        width: `${(criterion.score / 10) * 100}%`,
                        animationDelay: `${index * 0.05}s`
                      }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Feedback Message */}
          <Card className="border-2 bg-card/50 backdrop-blur">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-3">
                {isPassed ? "Great Job!" : "Keep Trying!"}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {isPassed ? (
                  level === "hard" ? (
                    "Exceptional work! You've successfully completed all levels of the admission test. Our team will review your application and contact you via email with the next steps."
                  ) : (
                    `Well done on passing the ${level} level! You can now proceed to the next challenge. Each level builds upon the previous one, testing your knowledge and skills progressively.`
                  )
                ) : (
                  `You need a minimum score of 5.0/10 to pass. Review the detailed feedback above to understand which areas need improvement. ${level === "easy" ? "Unfortunately, the easy level only allows one attempt." : "You can retry this level if attempts are remaining."
                  }`
                )}
              </p>

              {/* Email Sent Notification */}
              {currentAttempts >= maxAttempts && !isPassed && (
                <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-800 dark:text-blue-200">
                      {sendingEmail ? "Sending email notification..." :
                        emailSent ? "Email notification sent successfully!" :
                          "Processing email notification..."}
                    </span>
                  </div>
                  <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                    You have reached the maximum number of attempts for this level. A notification email has been sent with your results.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons - Simplified */}
          {/* Action Buttons - Simplified */}
          <div className="flex flex-col sm:flex-row gap-4">
            {(global_status === 'failed' || global_status === 'completed') ? (
              <Button
                size="lg"
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg animate-pulse"
                onClick={() => navigate("/final-results", { state: { studentId } })}
              >
                <Trophy className="w-5 h-5 mr-2" />
                View Final Verdict
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate("/levels")}
                >
                  <Home className="w-5 h-5 mr-2" />
                  Home
                </Button>

                <Button
                  size="lg"
                  variant="glow"
                  className="flex-1"
                  onClick={() => navigate("/levels", { state: { studentId, fromResults: true } })}
                >
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Detailed Analysis
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;
