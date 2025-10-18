import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Timer, Loader2 } from "lucide-react";

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
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes per question
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchQuestions = useCallback(async () => {
    try {
      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, num_questions: 5 }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate questions. Status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.questions || data.questions.length === 0) {
        throw new Error("No questions were generated.");
      }

      setQuestions(data.questions);
      setAnswers(new Array(data.questions.length).fill(""));
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [level, toast]);

  useEffect(() => {
    if (!studentId || !level) {
      navigate("/levels");
    } else {
      fetchQuestions();
    }
  }, [studentId, level, navigate, fetchQuestions]);

  useEffect(() => {
    if (questions.length > 0 && !loading) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            // Auto-submit or move to next question
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [questions.length, loading, currentQuestionIndex]);

  const handleAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = e.target.value;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setTimeLeft(180);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data: resultData, error: resultError } = await supabase
        .from("results")
        .insert({
          student_id: studentId,
          level,
          // Placeholder values, will be updated after evaluation
          score: 0,
          result: "pending",
        })
        .select()
        .single();

      if (resultError) throw resultError;

      const resultId = resultData.id;

      // Here you would save the questions and answers to the database
      // This is a simplified example

      toast({
        title: "Test Submitted!",
        description: "Your answers are being evaluated.",
      });

      navigate("/results", { state: { studentId, resultId } });
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Submission Failed",
        description: "Could not submit your test. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <TestSkeleton />;
  if (error) return <ErrorState message={error} onRetry={fetchQuestions} />;

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="container mx-auto p-4 sm:p-8 max-w-3xl">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">
              {level.charAt(0).toUpperCase() + level.slice(1)} Level Test
            </h1>
            <div className="flex items-center gap-2 text-lg font-semibold text-red-500">
              <Timer className="w-6 h-6" />
              <span>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
            </div>
          </div>
          <Progress value={progress} />
          <p className="text-sm text-muted-foreground mt-2">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">{currentQuestion?.question}</h2>
            <Textarea
              value={answers[currentQuestionIndex]}
              onChange={handleAnswerChange}
              placeholder="Type your answer here..."
              rows={8}
            />
          </div>
          <Button onClick={handleNext} disabled={submitting} className="w-full">
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : currentQuestionIndex < questions.length - 1 ? (
              "Next Question"
            ) : (
              "Submit Test"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

const TestSkeleton = () => (
  <div className="container mx-auto p-4 sm:p-8 max-w-3xl">
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-5 w-32 mt-2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-32 w-full mb-6" />
        <Skeleton className="h-12 w-full" />
      </CardContent>
    </Card>
  </div>
);

const ErrorState = ({ message, onRetry }: { message: string, onRetry: () => void }) => (
  <div className="container mx-auto p-8 max-w-3xl text-center">
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
    <Button onClick={onRetry} className="mt-4">
      Try Again
    </Button>
  </div>
);

export default Test;
