import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, XCircle, RotateCcw, Home, CheckCircle2, TrendingUp, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Results = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { studentId, score, result, level, detailedScores } = location.state || {};
  const [currentAttempts, setCurrentAttempts] = useState<number>(0);
  const [maxAttempts, setMaxAttempts] = useState<number>(0);
  const [emailSent, setEmailSent] = useState<boolean>(false);
  const [sendingEmail, setSendingEmail] = useState<boolean>(false);

  useEffect(() => {
    if (!studentId || score === undefined) {
      navigate("/registration");
      return;
    }
    loadAttemptData();
  }, [studentId, score]);

  const loadAttemptData = async () => {
    try {
      // Get the latest result to check attempts
      const { data: latestResult } = await supabase
        .from("results")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (latestResult) {
        const attemptsField = `attempts_${level}` as keyof typeof latestResult;
        const attempts = latestResult[attemptsField] as number || 0;
        setCurrentAttempts(attempts);
        
        // Set max attempts based on level
        const maxAttemptsByLevel = {
          easy: 1,
          medium: 2,
          hard: 2
        };
        const maxAttempts = maxAttemptsByLevel[level as keyof typeof maxAttemptsByLevel];
        setMaxAttempts(maxAttempts);

        // Check if max attempts reached and send email if needed
        if (attempts >= maxAttempts && !isPassed) {
          await handleMaxAttemptsReached();
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
        // Send email notification via backend API
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        const response = await fetch(`${backendUrl}/api/send-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to_email: studentData.email,
            student_name: `${studentData.first_name} ${studentData.last_name}`,
            result: "fail",
            score: score
          })
        });

        if (response.ok) {
          setEmailSent(true);
          toast({
            title: "Email Sent",
            description: "A notification email has been sent regarding your test results.",
          });
        } else {
          console.error("Email sending error");
          // Still mark as sent to avoid retry loops
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

  const isPassed = result === "pass";
  const scorePercentage = (score / 10) * 100;

  // Process detailed scores - handle 6 evaluation criteria from LangGraph
  const criteria = detailedScores && Array.isArray(detailedScores) ? 
    detailedScores.flatMap((item: any) => {
      // If item has scores object (6 criteria per question)
      if (item.scores) {
        return [
          { name: `Q${item.question_number}: Relevance`, score: item.scores.Relevance, category: "Relevance" },
          { name: `Q${item.question_number}: Clarity`, score: item.scores.Clarity, category: "Clarity" },
          { name: `Q${item.question_number}: Subject Understanding`, score: item.scores.SubjectUnderstanding, category: "Understanding" },
          { name: `Q${item.question_number}: Accuracy`, score: item.scores.Accuracy, category: "Accuracy" },
          { name: `Q${item.question_number}: Completeness`, score: item.scores.Completeness, category: "Completeness" },
          { name: `Q${item.question_number}: Critical Thinking`, score: item.scores.CriticalThinking, category: "Thinking" }
        ];
      }
      // Fallback format
      return [{
        name: `Question ${item.question_number || 1}`,
        score: item.score || item.average || 5,
        category: "Overall"
      }];
    }) : 
    [
      { name: "Overall Performance", score: score, category: "Overall" }
    ];

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
      <div className="absolute inset-0 bg-gradient-to-br from-background via-purple-50 to-blue-50 dark:from-background dark:via-purple-950/20 dark:to-blue-950/20" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
          {/* Result Header */}
          <Card className={`border-4 shadow-elevated ${isPassed ? 'border-green-500' : 'border-red-500'}`}>
            <CardContent className="p-12 text-center space-y-6">
              <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${
                isPassed ? 'bg-gradient-to-br from-green-500 to-emerald-500' : 'bg-gradient-to-br from-red-500 to-pink-500'
              } animate-scale-in glow-effect`}>
                {isPassed ? (
                  <Trophy className="w-12 h-12 text-white" />
                ) : (
                  <XCircle className="w-12 h-12 text-white" />
                )}
              </div>

              <div>
                <h1 className="text-4xl font-bold mb-2">
                  {isPassed ? (
                    <>Congratulations! <span className="gradient-text">You Passed!</span></>
                  ) : (
                    <>Test <span className="gradient-text">Not Passed</span></>
                  )}
                </h1>
                <p className="text-xl text-muted-foreground">
                  {level.charAt(0).toUpperCase() + level.slice(1)} Level Results
                </p>
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

              <Progress value={scorePercentage} className="h-3" />

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
              {criteria.map((criterion: any, index: number) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{criterion.name}</span>
                    <span className={`text-lg font-bold ${getScoreColor(criterion.score)}`}>
                      {criterion.score.toFixed(1)} / 10
                    </span>
                  </div>
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`absolute inset-y-0 left-0 ${getScoreBg(criterion.score)} transition-all duration-1000`}
                      style={{ 
                        width: `${(criterion.score / 10) * 100}%`,
                        animationDelay: `${index * 0.1}s`
                      }}
                    />
                  </div>
                  {criterion.feedback && (
                    <p className="text-sm text-muted-foreground mt-1 pl-2 border-l-2 border-primary/30">
                      {criterion.feedback}
                    </p>
                  )}
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
                  `You need a minimum score of 5.0/10 to pass. Review the detailed feedback above to understand which areas need improvement. ${
                    level === "easy" ? "Unfortunately, the easy level only allows one attempt." : "You can retry this level if attempts are remaining."
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

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            {isPassed && level !== "hard" ? (
              <Button
                size="lg"
                variant="glow"
                className="flex-1"
                onClick={() => navigate("/levels", { state: { studentId } })}
              >
                Continue to Next Level
                <Trophy className="w-5 h-5 ml-2" />
              </Button>
            ) : !isPassed && level !== "easy" && currentAttempts < maxAttempts ? (
              <Button
                size="lg"
                variant="glow"
                className="flex-1"
                onClick={handleRetryLevel}
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Retry Level (Attempt {currentAttempts + 1}/{maxAttempts})
              </Button>
            ) : null}
            
            <Button
              size="lg"
              variant="outline"
              className="flex-1"
              onClick={() => {
                // If max attempts reached or easy level failed, go to home
                if (currentAttempts >= maxAttempts || (level === "easy" && !isPassed)) {
                  navigate("/");
                } else {
                  navigate("/levels", { state: { studentId } });
                }
              }}
            >
              <Home className="w-5 h-5 mr-2" />
              {currentAttempts >= maxAttempts || (level === "easy" && !isPassed) ? "Back to Home" : "Back to Levels"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;
