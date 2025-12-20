import { MathRenderer } from "@/components/MathRenderer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, Leaf, Loader2, Sprout, Trees, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface Question {
  id: string;
  question: string;
  answer: string;
}

const TIMER_DURATIONS = {
  easy: 10 * 60,    // 10 minutes
  medium: 35 * 60,  // 35 minutes
  hard: 45 * 60     // 45 minutes
};

const Test = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { studentId, level, subject } = location.state || {};

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittedQuestions, setSubmittedQuestions] = useState<boolean[]>([]);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);

  // Timer states
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [timerActive, setTimerActive] = useState(false);
  const [timeOut, setTimeOut] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [questionIds, setQuestionIds] = useState<string[]>([]);

  // Prevent navigation away from test
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, '', window.location.pathname);
      toast({
        title: "Navigation Blocked",
        description: "Please complete or exit the test using the Exit button.",
        variant: "destructive"
      });
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (timerActive) {
        e.preventDefault();
        e.returnValue = 'You have an active test. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [timerActive, toast]);

  useEffect(() => {
    if (!studentId || !level) {
      navigate("/registration");
      return;
    }
    initializeTest();
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

  const initializeTest = async () => {
    try {
      setLoading(true);
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Authentication required');

      // Define strict type to avoid recursive type inference errors
      type ResultRow = {
        id: string;
        result: string | null;
        attempts_easy: number | null;
        attempts_medium: number | null;
        attempts_hard: number | null;
        created_at: string | null;
      };

      // 1. Get or Create Test Session
      const { data: previousResults } = await (supabase as any)
        .from("results")
        .select("id, result, attempts_easy, attempts_medium, attempts_hard, created_at")
        .eq("student_id", studentId)
        .eq("subject", String(subject || 'physics'))
        .eq("level", String(level))
        .order("created_at", { ascending: false })
        .limit(1) as { data: ResultRow[] | null, error: any };

      const previousAttempts = previousResults?.[0] || {
        attempts_easy: 0,
        attempts_medium: 0,
        attempts_hard: 0
      };

      const currentResult = previousResults?.[0];
      const isResumeable = currentResult && (currentResult.result === 'pending' || currentResult.result === 'in_progress');

      if (isResumeable) {
        setResultId(currentResult.id);
        await loadTestSession(currentResult.id, currentResult, token, backendUrl);
      } else {
        const createResponse = await fetch(`${backendUrl}/api/create-result`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            student_id: studentId,
            subject: subject || 'physics',
            level,
            attempts_easy: (previousAttempts.attempts_easy || 0) + (level === 'easy' ? 0 : 0), // Use logic handled by backend usually
            attempts_medium: (previousAttempts.attempts_medium || 0) + (level === 'medium' ? 1 : 0),
            attempts_hard: (previousAttempts.attempts_hard || 0) + (level === 'hard' ? 1 : 0)
          })
        });

        if (!createResponse.ok) throw new Error('Failed to initialize test session');
        const result = await createResponse.json();
        setResultId(result.id);

        await generateAndSaveQuestions(result.id, token, backendUrl);
        const duration = TIMER_DURATIONS[level as keyof typeof TIMER_DURATIONS];
        setTimeRemaining(duration);
        setTimerActive(true);
        setStartTime(Date.now());
      }

    } catch (error: any) {
      console.error('Test initialization error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to start test.",
        variant: "destructive"
      });
      navigate("/levels", { state: { studentId } });
    } finally {
      setLoading(false);
    }
  };

  const loadTestSession = async (rId: string, resultObj: any, token: string, backendUrl: string) => {
    const { count } = await supabase
      .from("questions")
      .select("*", { count: 'exact', head: true })
      .eq("result_id", rId);

    const hasQuestions = count && count > 0;

    if (hasQuestions) {
      // --- RESUME FLOW ---
      const sessionResponse = await fetch(`${backendUrl}/api/test-session/${rId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!sessionResponse.ok) throw new Error('Failed to fetch test session');
      const sessionData = await sessionResponse.json();

      setQuestions(sessionData.questions);
      setQuestionIds(sessionData.questions.map((q: any) => q.id));

      const restoredAnswers = sessionData.questions.map((q: any) => q.student_answer || "");
      setAnswers(restoredAnswers);
      setSubmittedQuestions(restoredAnswers.map((a: string) => !!a));

      const startTime = new Date(resultObj.created_at).getTime();
      const duration = TIMER_DURATIONS[level as keyof typeof TIMER_DURATIONS];
      const endTime = startTime + (duration * 1000);

      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));

      setTimeRemaining(remaining);
      setStartTime(startTime);

      if (remaining > 0) {
        setTimerActive(true);
      } else {
        setTimeOut(true);
        handleTimeOut();
      }

    } else {
      // Should not happen for a resumed test, but if so, generate
      await generateAndSaveQuestions(rId, token, backendUrl);
      const duration = TIMER_DURATIONS[level as keyof typeof TIMER_DURATIONS];
      setTimeRemaining(duration);
      setTimerActive(true);
      setStartTime(Date.now());
    }
  }

  const generateAndSaveQuestions = async (resId: string, token: string, backendUrl: string) => {
    const numQuestions = level === "easy" ? 5 : level === "medium" ? 3 : 2;

    const genResponse = await fetch(`${backendUrl}/api/generate-questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        subject: subject || 'physics',
        level,
        num_questions: numQuestions
      })
    });

    if (!genResponse.ok) throw new Error('Failed to generate questions');
    const data = await genResponse.json();

    setQuestions(data.questions);
    setAnswers(new Array(data.questions.length).fill(""));
    setSubmittedQuestions(new Array(data.questions.length).fill(false));

    const saveResponse = await fetch(`${backendUrl}/api/save-questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        result_id: resId,
        questions: data.questions
      })
    });

    if (!saveResponse.ok) throw new Error('Failed to save questions');

    const { data: savedQuestions } = await supabase
      .from("questions")
      .select("id")
      .eq("result_id", resId)
      .order("created_at");

    if (savedQuestions) {
      setQuestionIds(savedQuestions.map(q => q.id));
    }
  };

  const handleTimeOut = async () => {
    toast({
      title: "Time's Up!",
      description: "The test time has expired. Submitting your answers...",
      variant: "destructive"
    });
    await submitAllAnswers(true);
  };

  const handleAnswerChange = (value: string) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = value;
    setAnswers(newAnswers);
  };

  const handleSubmitCurrentAnswer = async () => {
    if (!answers[currentQuestionIndex]?.trim()) {
      toast({
        title: "Answer Required",
        description: "Please provide an answer before submitting",
        variant: "destructive"
      });
      return;
    }

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (resultId && questionIds[currentQuestionIndex]) {
        await fetch(`${backendUrl}/api/save-answer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            result_id: resultId,
            question_id: questionIds[currentQuestionIndex],
            student_answer: answers[currentQuestionIndex]
          })
        });
      }
    } catch (error) {
      console.error("Failed to save answer:", error);
    }

    const newSubmitted = [...submittedQuestions];
    newSubmitted[currentQuestionIndex] = true;
    setSubmittedQuestions(newSubmitted);

    toast({
      title: "Answer Saved",
      description: `Question ${currentQuestionIndex + 1} answer saved successfully`,
    });

    if (currentQuestionIndex === questions.length - 1) {
      submitAllAnswers();
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const submitAllAnswers = async (isTimeout: boolean = false) => {
    try {
      if (!resultId) throw new Error("No test result ID found");
      setSubmitting(true);
      setTimerActive(false);

      const backendUrl = import.meta.env.VITE_BACKEND_URL;

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Create ID-based map for robust saving
      const answersMap: { [key: string]: string } = {};
      questions.forEach((q, idx) => {
        answersMap[q.id] = answers[idx] || "";
      });

      const response = await fetch(`${backendUrl}/api/submit-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          result_id: resultId,
          answers: answersMap, // Sending Map instead of List
          is_timeout: isTimeout
        })
      });

      if (!response.ok) throw new Error('Failed to save answers');

      // Step 2: Trigger Evaluation
      toast({
        title: "Processing Results",
        description: "AI is evaluating your answers...",
      });

      const evalResponse = await fetch(`${backendUrl}/api/evaluate-answers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ result_id: resultId })
      });

      if (!evalResponse.ok) throw new Error('Failed to evaluate answers');
      const resultData = await evalResponse.json();

      toast({
        title: isTimeout ? "Test Timed Out" : "Test Submitted",
        description: "Your answers have been evaluated.",
      });

      if (isTimeout) {
        navigate(`/review/${level}`, {
          state: {
            studentId,
            subject,
            fromResults: true
          }
        });
      } else {
        navigate("/results", {
          state: {
            ...resultData,
            studentId,
            completed: true,
            global_status: resultData.global_status
          }
        });
      }

    } catch (error: any) {
      console.error('Submission error:', error);
      toast({
        title: "Error",
        description: "Failed to submit test. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExit = () => {
    setShowExitDialog(true);
  };

  const confirmExit = async () => {
    if (answers[currentQuestionIndex]?.trim() && !submittedQuestions[currentQuestionIndex]) {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (resultId && questionIds[currentQuestionIndex]) {
          await fetch(`${backendUrl}/api/save-answer`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              result_id: resultId,
              question_id: questionIds[currentQuestionIndex],
              student_answer: answers[currentQuestionIndex]
            })
          });
        }
      } catch (e) {
        console.error("Failed to save answer on exit", e);
      }
    }
    navigate("/levels", { state: { studentId } });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-emerald-600" />
          <p className="text-lg text-emerald-800">Preparing your test environment...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;
  const isCurrentSubmitted = submittedQuestions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden font-sans transition-colors duration-500">
      {/* Organic shapes background - Subtle in dark mode */}
      <motion.div
        className="absolute top-0 right-0 w-96 h-96 rounded-full bg-gradient-to-br from-green-200/40 to-emerald-300/40 dark:from-emerald-500/5 dark:to-green-500/5 blur-3xl"
        animate={{
          x: [0, 80, 0],
          y: [0, 60, 0],
          scale: [1, 1.2, 1]
        }}
        transition={{ duration: 20, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-gradient-to-br from-emerald-200/40 to-green-300/40 dark:from-emerald-500/5 dark:to-green-500/5 blur-3xl"
        animate={{
          x: [0, -60, 0],
          y: [0, -80, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 18, repeat: Infinity }}
      />

      {/* Floating leaves - Subtle in dark mode */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-green-300/30 dark:text-emerald-500/10"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`
          }}
          animate={{
            y: [0, -30, 0],
            rotate: [0, 360],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 10 + i * 2,
            repeat: Infinity,
            delay: i * 0.5
          }}
        >
          <Leaf className="w-8 h-8" />
        </motion.div>
      ))}

      <div className="container mx-auto px-4 py-4 h-screen flex flex-col max-w-6xl relative z-10">
        {/* Nature-inspired Header - Compact */}
        <motion.div
          className="mb-4 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border-2 border-green-200 dark:border-slate-800 rounded-2xl p-4 shadow-md shrink-0 transition-colors duration-300"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <motion.div
                className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-md"
                animate={{
                  boxShadow: [
                    '0 5px 20px rgba(16, 185, 129, 0.2)',
                    '0 5px 30px rgba(16, 185, 129, 0.4)',
                    '0 5px 20px rgba(16, 185, 129, 0.2)'
                  ]
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Trees className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold text-green-800 dark:text-slate-100 capitalize leading-tight">{level} Level Test: <span className="text-emerald-600">{subject || 'Physics'}</span></h1>
                <p className="text-emerald-600 dark:text-slate-400 text-sm font-medium">Question {currentQuestionIndex + 1} of {questions.length}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-green-100 to-emerald-100 dark:from-slate-800 dark:to-slate-800 border border-green-200 dark:border-slate-700 rounded-xl px-4 py-2 shadow-sm min-w-[140px]">
                <div className="flex items-center gap-2 justify-center">
                  <Clock className={`w-4 h-4 ${timeRemaining < 60 ? 'text-red-500 animate-pulse' : 'text-green-600 dark:text-emerald-400'}`} />
                  <div>
                    <p className="text-[10px] text-green-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-center">Time Remaining</p>
                    <p className={`text-lg font-bold leading-none tabular-nums text-center ${timeRemaining < 60 ? 'text-red-600 dark:text-red-400' : 'text-green-800 dark:text-slate-200'}`}>
                      {formatTime(timeRemaining)}
                    </p>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleExit}
                size="sm"
                className="bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 hover:border-red-200 rounded-xl px-4 h-10 shadow-sm transition-all duration-300"
              >
                <X className="w-4 h-4 mr-2" />
                Exit
              </Button>
            </div>
          </div>

          {/* Organic Progress - Compact */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {questions.map((_, index) => {
              const num = index + 1;
              return (
                <div key={num} className="flex-1 flex items-center gap-2 min-w-[40px]">
                  <motion.div
                    className={`relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer transition-colors duration-300 ${submittedQuestions[index]
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-sm'
                      : index === currentQuestionIndex
                        ? 'bg-gradient-to-br from-emerald-400 to-green-400 text-white shadow-md'
                        : 'bg-green-100 dark:bg-slate-800 text-green-400 dark:text-slate-400 border border-green-200 dark:border-slate-700'
                      }`}
                    whileHover={{ scale: 1.1 }}
                    onClick={() => setCurrentQuestionIndex(index)}
                  >
                    {submittedQuestions[index] ? <CheckCircle2 className="w-4 h-4" /> : num}
                    {index === currentQuestionIndex && (
                      <motion.div
                        className="absolute inset-0 rounded-full border border-green-400 dark:border-emerald-500"
                        animate={{ scale: [1, 1.3, 1], opacity: [1, 0, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </motion.div>
                  {index < questions.length - 1 && (
                    <div className="flex-1 h-1 bg-green-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: index < currentQuestionIndex || submittedQuestions[index] ? "100%" : "0%" }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Question Card - Flex Grow to fill space but not overflow */}
        <motion.div
          className="flex-1 min-h-0 mb-4 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border-2 border-green-200 dark:border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col transition-colors duration-300"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          key={currentQuestionIndex}
        >
          <div className="flex items-center gap-3 mb-4 shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-green-500 rounded-xl flex items-center justify-center shadow-sm">
              <Sprout className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-green-800 dark:text-slate-100">Question {currentQuestionIndex + 1}</h2>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-slate-800/50 dark:to-slate-800/30 border border-green-100 dark:border-slate-700 rounded-xl p-4 mb-4 shrink-0 overflow-y-auto max-h-[15vh]">
            <div className="text-green-900 dark:text-slate-200 text-base md:text-lg leading-relaxed font-medium">
              {/* Robust LaTeX Rendering Integration */}
              <MathRenderer text={currentQuestion?.question} />
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <label className="text-green-700 dark:text-slate-400 mb-2 block flex items-center gap-2 text-sm font-semibold shrink-0">
              <Leaf className="w-4 h-4 text-emerald-500" />
              Your Answer
            </label>
            <div className="relative flex-1 min-h-0">
              <Textarea
                className="w-full h-full bg-gradient-to-br from-white to-green-50/50 dark:from-slate-950 dark:to-slate-900 border-2 border-green-200 dark:border-slate-700 rounded-xl p-4 text-green-900 dark:text-slate-200 placeholder-green-400/70 dark:placeholder-slate-600 resize-none focus:outline-none focus:ring-4 focus:ring-green-200 dark:focus:ring-emerald-900/30 focus:border-green-300 dark:focus:border-emerald-500/50 text-base shadow-inner transition-all duration-300"
                placeholder="Share your thoughtful answer here..."
                value={answers[currentQuestionIndex] || ''}
                onChange={(e) => handleAnswerChange(e.target.value)}
                disabled={isCurrentSubmitted}
              />
              {isCurrentSubmitted && (
                <div className="absolute top-3 right-3 bg-green-100 dark:bg-emerald-900/30 text-green-700 dark:text-emerald-400 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Submitted
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3 mt-4 shrink-0">
            <Button
              variant="outline"
              size="default"
              className="border-2 border-green-300 dark:border-slate-700 text-green-700 dark:text-slate-300 hover:bg-green-50 dark:hover:bg-slate-800 px-6 rounded-xl font-medium transition-all duration-300 bg-transparent"
              onClick={handlePrevious}
              disabled={isFirstQuestion}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Prev
            </Button>

            {!isLastQuestion && (
              <Button
                size="default"
                className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white px-8 rounded-xl shadow-md font-bold transition-all duration-300 transform hover:scale-105"
                onClick={handleSubmitCurrentAnswer}
                disabled={isCurrentSubmitted || !answers[currentQuestionIndex]?.trim()}
              >
                {isCurrentSubmitted ? "Saved" : "Save"}
              </Button>
            )}

            {isLastQuestion && (
              <Button
                size="default"
                className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white px-8 rounded-xl shadow-md font-bold transition-all duration-300 transform hover:scale-105"
                onClick={handleSubmitCurrentAnswer}
                disabled={submitting || isCurrentSubmitted}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Test"
                )}
              </Button>
            )}

            <Button
              size="default"
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 rounded-xl shadow-md font-medium transition-all duration-300"
              onClick={handleNext}
              disabled={isLastQuestion}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </motion.div>

        {/* Progress Summary - Compact Footer */}
        <motion.div
          className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-green-200 dark:border-slate-800 rounded-2xl p-3 shadow-md shrink-0 transition-colors duration-300"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex justify-around items-center gap-4">
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 leading-none">
                {submittedQuestions.filter(Boolean).length}
              </p>
              <p className="text-[10px] text-green-700 dark:text-slate-400 font-medium uppercase tracking-wide">Submitted</p>
            </div>
            <div className="h-8 w-px bg-green-200 dark:bg-slate-800"></div>
            <div className="text-center">
              <p className="text-lg font-bold text-amber-500 dark:text-amber-400 leading-none">
                {submittedQuestions.filter((s, idx) => !s && answers[idx]?.trim()).length}
              </p>
              <p className="text-[10px] text-green-700 dark:text-slate-400 font-medium uppercase tracking-wide">Draft</p>
            </div>
            <div className="h-8 w-px bg-green-200 dark:bg-slate-800"></div>
            <div className="text-center">
              <p className="text-lg font-bold text-green-500 dark:text-slate-400 leading-none">
                {submittedQuestions.filter((s, idx) => !s && !answers[idx]?.trim()).length}
              </p>
              <p className="text-[10px] text-green-700 dark:text-slate-400 font-medium uppercase tracking-wide">Pending</p>
            </div>
          </div>
        </motion.div>
      </div>

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-2 border-green-200 dark:border-slate-800 rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl text-green-800 dark:text-slate-100">Exit Test?</AlertDialogTitle>
            <AlertDialogDescription className="text-green-700 dark:text-slate-400 text-lg">
              Are you sure you want to exit?
              <br /><br />
              <span className="font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-800/50">
                Warning: The timer will continue running in the background.
              </span>
              <br /><br />
              You can resume the test later if time remains. If the time expires while you are away, the test will be automatically submitted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl border-2 border-green-200 dark:border-slate-700 text-green-700 dark:text-slate-300 hover:bg-green-50 dark:hover:bg-slate-800 bg-transparent">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit} className="bg-red-500 hover:bg-red-600 text-white rounded-2xl px-6">
              Exit Test
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
};

export default Test;
