import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, ChevronLeft, ChevronRight, CheckCircle2, Clock } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ModeToggle } from "@/components/mode-toggle";

interface Question {
  question: string;
  answer: string;
}

// Timer durations in seconds
const TIMER_DURATIONS = {
  easy: 10 * 60,    // 10 minutes
  medium: 35 * 60,  // 35 minutes
  hard: 45 * 60     // 45 minutes
};

const Test = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { studentId, level, currentAttempt } = location.state || {};
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [submittedQuestions, setSubmittedQuestions] = useState<boolean[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);
  
  // Timer states
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [timerActive, setTimerActive] = useState(false);
  const [timeOut, setTimeOut] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [totalTimeTaken, setTotalTimeTaken] = useState<number>(0);

  useEffect(() => {
    if (!studentId || !level) {
      navigate("/registration");
      return;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    generateQuestions();

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [studentId, level]);

  // Timer effect
  useEffect(() => {
    if (!timerActive || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setTimeOut(true);
          setTimerActive(false);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, timeRemaining]);

  const generateQuestions = async () => {
    try {
      const numQuestions = level === "easy" ? 5 : level === "medium" ? 3 : 2;
      
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      if (!backendUrl) {
        throw new Error('Backend URL not configured');
      }

      // Get Firebase token for authentication
      const token = localStorage.getItem('firebase_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${backendUrl}/api/generate-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ level, num_questions: numQuestions })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Question generation error:', errorText);
        throw new Error('Failed to generate questions');
      }
      
      const data = await response.json();
      
      if (!data || !data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error('Invalid questions response from server');
      }

      setQuestions(data.questions);
      setAnswers(new Array(data.questions.length).fill(""));
      setSubmittedQuestions(new Array(data.questions.length).fill(false));
      
      // Start timer and track start time
      const duration = TIMER_DURATIONS[level as keyof typeof TIMER_DURATIONS];
      setTimeRemaining(duration);
      setTimerActive(true);
      setStartTime(Date.now()); // Track when test started
      
      // Get previous attempts from Supabase
      const { data: previousResults, error: fetchError } = await supabase
        .from("results")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (fetchError) {
        console.warn('Error fetching previous results:', fetchError);
      }

      const previousAttempts = previousResults?.[0] || {
        attempts_easy: 0,
        attempts_medium: 0,
        attempts_hard: 0
      };

      // Create result entry via backend API
      if (!token) {
        throw new Error('Authentication required');
      }

      const createResultResponse = await fetch(`${backendUrl}/api/create-result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          student_id: studentId,
          level,
          attempts_easy: previousAttempts.attempts_easy || 0,
          attempts_medium: previousAttempts.attempts_medium || 0,
          attempts_hard: previousAttempts.attempts_hard || 0
        })
      });

      if (!createResultResponse.ok) {
        throw new Error('Failed to create test result entry');
      }

      const result = await createResultResponse.json();
      setResultId(result.id);

      // Save questions via backend API
      const saveQuestionsResponse = await fetch(`${backendUrl}/api/save-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          result_id: result.id,
          questions: data.questions
        })
      });

      if (!saveQuestionsResponse.ok) {
        throw new Error('Failed to save questions');
      }
      
    } catch (error: any) {
      console.error('Generate questions error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate questions. Please try again.",
        variant: "destructive"
      });
      navigate("/levels", { state: { studentId } });
    } finally {
      setLoading(false);
    }
  };

  const handleTimeOut = async () => {
    toast({
      title: "Time's Up!",
      description: "The test time has expired. Submitting your answers...",
      variant: "destructive"
    });

    // Auto-submit with current answers
    await submitAllAnswers(true); // Pass true to indicate timeout
  };

  const handleAnswerChange = (value: string) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = value;
    setAnswers(newAnswers);
  };

  const handleSubmitCurrentAnswer = () => {
    if (!answers[currentQuestionIndex]?.trim()) {
      toast({
        title: "Answer Required",
        description: "Please provide an answer before submitting",
        variant: "destructive"
      });
      return;
    }

    // Mark current question as submitted
    const newSubmitted = [...submittedQuestions];
    newSubmitted[currentQuestionIndex] = true;
    setSubmittedQuestions(newSubmitted);

    toast({
      title: "Answer Submitted",
      description: `Question ${currentQuestionIndex + 1} answer saved successfully`,
    });

    // If this is the last question, submit all answers
    if (currentQuestionIndex === questions.length - 1) {
      submitAllAnswers();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const submitAllAnswers = async (isTimeout: boolean = false) => {
    // For timeout, don't check if all questions are answered
    if (!isTimeout) {
      const unansweredQuestions = answers.map((ans, idx) => ans?.trim() ? null : idx + 1).filter(Boolean);
      if (unansweredQuestions.length > 0) {
        toast({
          title: "Incomplete Answers",
          description: `Please answer all questions. Missing: Q${unansweredQuestions.join(', Q')}`,
          variant: "destructive"
        });
        return;
      }
    }

    setSubmitting(true);
    setTimerActive(false); // Stop timer
    
    try {
      if (!resultId) {
        throw new Error("No test result ID found");
      }

      // Save all answers (even empty ones for timeout)
      const { data: questionRecords, error: questionsError } = await supabase
        .from("questions")
        .select("id")
        .eq("result_id", resultId)
        .order("created_at");

      if (questionsError || !questionRecords || questionRecords.length === 0) {
        throw new Error("Failed to fetch questions");
      }

      const answersToInsert = answers.map((answer, idx) => {
        if (!questionRecords[idx]) return null;
        return {
          question_id: questionRecords[idx].id,
          student_answer: answer || ""  // Empty string for unanswered
        };
      }).filter(Boolean);

      if (answersToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("student_answers")
          .insert(answersToInsert);
        
        if (insertError) {
          console.error("Error inserting answers:", insertError);
          throw new Error("Failed to save answers");
        }
      }

      // Evaluate answers
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      
      // Get Firebase token for authentication
      const token = localStorage.getItem('firebase_token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const evalResponse = await fetch(`${backendUrl}/api/evaluate-answers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ result_id: resultId })
      });

      if (!evalResponse.ok) {
        throw new Error('Failed to evaluate answers');
      }

      const evaluationData = await evalResponse.json();

      // Get current result
      const { data: currentResult, error: resultError } = await supabase
        .from("results")
        .select("*")
        .eq("id", resultId)
        .single();

      if (resultError || !currentResult) {
        throw new Error("Result not found");
      }

      const attemptsField = `attempts_${level}`;
      const newAttemptCount = (currentResult[attemptsField] || 0) + 1;
      
      // Determine result based on score and timeout
      let testResult: string;
      let testScore = evaluationData.score || 0;
      
      if (isTimeout) {
        // If timeout but score >= 5, still pass
        testResult = testScore >= 5 ? 'pass' : 'fail';
      } else {
        testResult = evaluationData.result || 'fail';
      }

      // Update result with incremented attempts
      await supabase
        .from("results")
        .update({
          [attemptsField]: newAttemptCount
        })
        .eq("id", resultId);

      // If timeout with passing score, show message and go to levels
      if (isTimeout && testScore >= 5) {
        toast({
          title: "Time's Up - But You Passed!",
          description: `Your score: ${testScore.toFixed(1)}/10. You can proceed to the next level!`,
        });
        
        // Small delay to show the toast
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        navigate("/levels", { state: { studentId } });
        return;
      }

      // Determine what happens next and if email should be sent
      const shouldSendEmail = await determineNextStep(
        level,
        testResult,
        newAttemptCount,
        studentId,
        testScore,
        isTimeout
      );

      // Navigate to results
      navigate("/results", {
        state: {
          studentId,
          score: testScore,
          result: testResult,
          level,
          criteria: evaluationData.criteria || {},
          emailSent: shouldSendEmail,
          timeout: isTimeout
        }
      });
      
    } catch (error: any) {
      console.error("Test submission error:", error);
      toast({
        title: "Submission Error",
        description: error.message || "Failed to submit test. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const determineNextStep = async (
    currentLevel: string,
    result: string,
    attempts: number,
    studentId: string,
    score: number,
    isTimeout: boolean = false
  ): Promise<boolean> => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    let shouldSendEmail = false;

    try {
      const { data: studentData } = await supabase
        .from("students")
        .select("*")
        .eq("id", studentId)
        .single();

      const { data: allResults } = await supabase
        .from("results")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      const mediumPassed = allResults?.some(r => r.level === 'medium' && r.result === 'pass');

      if (currentLevel === "easy") {
        // Only send fail email if score < 5
        if ((result === "fail" && score < 5) || (isTimeout && score < 5)) {
          shouldSendEmail = true;
          await sendEmailNotification(backendUrl, studentData, "fail", score);
        }
        // If timeout but score >= 5, no email (already passed)
      } else if (currentLevel === "medium") {
        const maxAttempts = 2;
        if (result === "pass" && !isTimeout) {
          // Medium passed - no email, continue to hard
          shouldSendEmail = false;
        } else if ((result === "fail" && score < 5 && attempts >= maxAttempts) || (isTimeout && score < 5 && attempts >= maxAttempts)) {
          // Medium failed both attempts with score < 5 - send fail email
          shouldSendEmail = true;
          await sendEmailNotification(backendUrl, studentData, "fail", score);
        }
        // If timeout but score >= 5, or still has attempts, no email
      } else if (currentLevel === "hard") {
        const maxAttempts = 2;
        if (result === "pass" && !isTimeout) {
          // Hard passed - send pass email
          shouldSendEmail = true;
          await sendEmailNotification(backendUrl, studentData, "pass", score);
        } else if (attempts >= maxAttempts && score < 5) {
          // Hard failed both attempts with score < 5
          if (mediumPassed) {
            // Medium was passed, so overall pass
            shouldSendEmail = true;
            await sendEmailNotification(backendUrl, studentData, "pass", score);
          } else {
            // Both medium and hard failed with low score
            shouldSendEmail = true;
            await sendEmailNotification(backendUrl, studentData, "fail", score);
          }
        }
        // If timeout but score >= 5, or still has attempts, no email
      }
    } catch (error) {
      console.error("Error determining next step:", error);
    }

    return shouldSendEmail;
  };

  const sendEmailNotification = async (
    backendUrl: string,
    studentData: any,
    result: string,
    score: number
  ) => {
    try {
      // Get Firebase token for authentication
      const token = localStorage.getItem('firebase_token');
      if (!token) {
        console.error('No Firebase token found for email notification');
        return;
      }
      
      await fetch(`${backendUrl}/api/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          to_email: studentData.email,
          student_name: `${studentData.first_name} ${studentData.last_name}`,
          result: result,
          score: score,
          student_id: studentId,
          level: level
        })
      });
    } catch (error) {
      console.error("Email send error:", error);
    }
  };

  const handleExit = () => {
    setShowExitDialog(true);
  };

  const confirmExit = () => {
    navigate("/levels", { state: { studentId } });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-lg text-muted-foreground">Generating questions...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;
  const isCurrentSubmitted = submittedQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    const percentage = (timeRemaining / TIMER_DURATIONS[level as keyof typeof TIMER_DURATIONS]) * 100;
    if (percentage > 50) return 'text-green-600 dark:text-green-400';
    if (percentage > 20) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400 animate-pulse';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 dark:from-primary/10 dark:via-background dark:to-secondary/10 p-4">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ModeToggle />
      </div>

      <div className="max-w-4xl mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">
              {level.charAt(0).toUpperCase() + level.slice(1)} Level Test
            </h1>
            <p className="text-muted-foreground">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Timer Display */}
            <Card className={`px-4 py-2 ${timeRemaining < 60 ? 'animate-pulse border-red-500' : ''}`}>
              <div className="flex items-center gap-2">
                <Clock className={`w-5 h-5 ${getTimerColor()}`} />
                <div>
                  <p className="text-xs text-muted-foreground">Time Remaining</p>
                  <p className={`text-2xl font-bold ${getTimerColor()}`}>
                    {formatTime(timeRemaining)}
                  </p>
                </div>
              </div>
            </Card>
            <Button variant="outline" onClick={handleExit}>
              Exit Test
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            {questions.map((_, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  submittedQuestions[idx] 
                    ? 'bg-green-500 text-white' 
                    : idx === currentQuestionIndex 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}>
                  {submittedQuestions[idx] ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Question Card */}
        <Card>
          <CardHeader>
            <CardTitle>Question {currentQuestionIndex + 1}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-lg">{currentQuestion.question}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Your Answer:</label>
              <Textarea
                value={answers[currentQuestionIndex]}
                onChange={(e) => handleAnswerChange(e.target.value)}
                placeholder="Write your detailed answer here..."
                className="min-h-[200px]"
                disabled={isCurrentSubmitted}
              />
              {isCurrentSubmitted && (
                <p className="text-sm text-green-600 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Answer submitted for this question
                </p>
              )}
            </div>

            {/* Navigation & Submit Buttons */}
            <div className="flex items-center justify-between gap-4">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={isFirstQuestion}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <div className="flex gap-2">
                {!isLastQuestion && (
                  <Button
                    onClick={handleSubmitCurrentAnswer}
                    disabled={isCurrentSubmitted || !answers[currentQuestionIndex]?.trim()}
                  >
                    {isCurrentSubmitted ? "Submitted" : "Submit Answer"}
                  </Button>
                )}

                {isLastQuestion && (
                  <Button
                    onClick={handleSubmitCurrentAnswer}
                    disabled={submitting}
                    variant="glow"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting Test...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit Test
                      </>
                    )}
                  </Button>
                )}
              </div>

              <Button
                variant="outline"
                onClick={handleNext}
                disabled={isLastQuestion}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Progress Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {submittedQuestions.filter(Boolean).length}
                </p>
                <p className="text-sm text-muted-foreground">Submitted</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {submittedQuestions.filter((s, idx) => !s && answers[idx]?.trim()).length}
                </p>
                <p className="text-sm text-muted-foreground">Draft</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {submittedQuestions.filter((s, idx) => !s && !answers[idx]?.trim()).length}
                </p>
                <p className="text-sm text-muted-foreground">Unanswered</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exit Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Test?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress will be lost if you exit now. Are you sure you want to leave?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit}>Exit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Test;
