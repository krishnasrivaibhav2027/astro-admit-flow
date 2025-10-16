import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Question {
  question: string;
  answer: string;
}

const Test = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { studentId, level, currentAttempt } = location.state || {};
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [studentAnswer, setStudentAnswer] = useState("");
  const [studentAnswers, setStudentAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId || !level) {
      navigate("/registration");
      return;
    }

    // Prevent accidental navigation
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

  const generateQuestions = async () => {
    try {
      const numQuestions = level === "easy" ? 5 : level === "medium" ? 3 : 2;
      
      // Use backend API instead of Supabase Edge Function
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/generate-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ level, num_questions: numQuestions })
      });

      if (!response.ok) {
        throw new Error('Failed to generate questions');
      }
      
      const data = await response.json();
      setQuestions(data.questions);
      
      // Fetch previous results to get current attempt counts
      const { data: previousResults } = await supabase
        .from("results")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(1);

      const previousAttempts = previousResults?.[0] || {
        attempts_easy: 0,
        attempts_medium: 0,
        attempts_hard: 0
      };

      // Create result entry with current attempt counts
      const { data: result, error: resultError } = await supabase
        .from("results")
        .insert([{
          student_id: studentId,
          level,
          result: "pending",
          score: null,
          attempts_easy: previousAttempts.attempts_easy || 0,
          attempts_medium: previousAttempts.attempts_medium || 0,
          attempts_hard: previousAttempts.attempts_hard || 0
        }])
        .select()
        .single();

      if (resultError) throw resultError;
      setResultId(result.id);

      // Save questions
      const questionsToInsert = data.questions.map((q: Question) => ({
        result_id: result.id,
        question_text: q.question,
        correct_answer: q.answer
      }));

      await supabase.from("questions").insert(questionsToInsert);
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate questions",
        variant: "destructive"
      });
      navigate("/levels", { state: { studentId } });
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!studentAnswer.trim()) {
      toast({
        title: "Answer Required",
        description: "Please provide an answer before proceeding",
        variant: "destructive"
      });
      return;
    }

    setStudentAnswers([...studentAnswers, studentAnswer]);
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setStudentAnswer("");
    } else {
      submitTest([...studentAnswers, studentAnswer]);
    }
  };

  const submitTest = async (allAnswers: string[]) => {
    setSubmitting(true);
    
    try {
      // Save all answers
      const { data: questionRecords } = await supabase
        .from("questions")
        .select("id")
        .eq("result_id", resultId)
        .order("created_at");

      if (questionRecords) {
        const answersToInsert = allAnswers.map((answer, idx) => ({
          question_id: questionRecords[idx].id,
          student_answer: answer
        }));

        await supabase.from("student_answers").insert(answersToInsert);
      }

      // Evaluate answers using backend API instead of Supabase Edge Function
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const evalResponse = await fetch(`${backendUrl}/api/evaluate-answers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ result_id: resultId })
      });

      if (!evalResponse.ok) {
        throw new Error('Failed to evaluate answers');
      }

      const evaluationData = await evalResponse.json();

      // Get current result to update attempts
      const { data: currentResult } = await supabase
        .from("results")
        .select("*")
        .eq("id", resultId)
        .single();

      if (!currentResult) throw new Error("Result not found");

      const attemptsField = `attempts_${level}`;
      
      const newAttemptCount = (currentResult[attemptsField] || 0) + 1;
      const testResult = evaluationData.result; // 'pass' or 'fail' from backend

      // Update result with incremented attempts
      await supabase
        .from("results")
        .update({
          [attemptsField]: newAttemptCount
        })
        .eq("id", resultId);

      // Check if max attempts reached or test passed, send email notification
      const maxAttempts = level === "easy" ? 1 : 2;
      if (testResult === "pass" || newAttemptCount >= maxAttempts) {
        try {
          // Get student data for email
          const { data: studentData } = await supabase
            .from("students")
            .select("*")
            .eq("id", studentId)
            .single();

          if (studentData) {
            // Send email notification via backend API
            await fetch(`${backendUrl}/api/send-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to_email: studentData.email,
                student_name: `${studentData.first_name} ${studentData.last_name}`,
                result: testResult,
                score: evaluationData.score  // Out of 10
              })
            });
          }
        } catch (emailError) {
          console.error("Error sending email notification:", emailError);
          // Don't fail the test submission if email fails
        }
      }

      navigate("/results", {
        state: {
          studentId,
          score: evaluationData.score,  // Out of 10
          result: testResult,
          level,
          criteria: evaluationData.criteria  // 6 criteria averages
        }
      });
      
    } catch (error: any) {
      toast({
        title: "Submission Error",
        description: error.message || "Failed to submit test",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackClick = () => {
    setShowExitDialog(true);
  };

  const confirmExit = () => {
    navigate("/levels", { state: { studentId } });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-lg text-muted-foreground">Generating your questions...</p>
        </div>
      </div>
    );
  }

  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-purple-50 to-blue-50 dark:from-background dark:via-purple-950/20 dark:to-blue-950/20" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />

      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={handleBackClick}>
              ← Exit Test
            </Button>
            <div className="text-sm font-medium">
              Question {currentQuestionIndex + 1} of {questions.length}
            </div>
          </div>

          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="text-xs text-muted-foreground text-right">
              {Math.round(progress)}% Complete
            </div>
          </div>

          <Card className="border-2 shadow-elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">
                  <span className="gradient-text">{level.charAt(0).toUpperCase() + level.slice(1)}</span> Level
                </CardTitle>
                <div className="px-4 py-2 rounded-lg bg-primary/10 text-primary font-medium">
                  Attempt {currentAttempt}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="p-6 rounded-xl bg-muted/50 border-2 border-muted">
                <p className="text-lg leading-relaxed">
                  {questions[currentQuestionIndex]?.question}
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">Your Answer</label>
                <Textarea
                  value={studentAnswer}
                  onChange={(e) => setStudentAnswer(e.target.value)}
                  placeholder="Type your detailed answer here..."
                  className="min-h-[200px] resize-none text-base"
                  disabled={submitting}
                />
                <p className="text-sm text-muted-foreground">
                  Provide a comprehensive answer. Your response will be evaluated on relevance, clarity, accuracy, and critical thinking.
                </p>
              </div>

              <Button
                onClick={handleNext}
                size="lg"
                className="w-full"
                variant="glow"
                disabled={submitting || !studentAnswer.trim()}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Evaluating...
                  </>
                ) : currentQuestionIndex < questions.length - 1 ? (
                  <>
                    Next Question
                    <Send className="w-5 h-5 ml-2" />
                  </>
                ) : (
                  <>
                    Submit Test
                    <Send className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Test?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to exit? Your progress will be lost and this will count as an attempt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Test</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit} className="bg-destructive text-destructive-foreground">
              Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Test;
