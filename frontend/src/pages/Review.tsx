import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, ArrowLeft, Brain, CheckCircle2, ChevronLeft, ChevronRight, Lightbulb, RotateCcw, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

interface Question {
  id: string;
  question_text: string;
  correct_answer: string;
  student_answer?: string;
  explanation?: string;
  is_correct?: boolean;
}

interface AIReviewState {
  [key: string]: {
    expanded: boolean;
    content: string;
    loading: boolean;
  };
}

const Review = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { level } = useParams<{ level: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [levelAttempted, setLevelAttempted] = useState(false);
  const [aiReviews, setAiReviews] = useState<AIReviewState>({});
  const [canRetake, setCanRetake] = useState(false);
  const [currentAttempts, setCurrentAttempts] = useState(0);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [subject, setSubject] = useState<string>("physics");
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    loadReviewData();
  }, [level]);

  const loadReviewData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const studentId = sessionStorage.getItem('studentId');

      if (!studentId || !token) {
        toast({
          title: "Authentication Required",
          description: "Please login to view review.",
          variant: "destructive"
        });
        navigate("/login");
        return;
      }

      const locationState = location.state || {};
      const subjectParam = locationState.subject || "physics";

      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/review/${level}/${studentId}?subject=${subjectParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load review data');
      }

      const data = await response.json();
      setQuestions(data.questions);
      setLevelAttempted(data.attempted);
      setCanRetake(data.can_retake || false);
      setCurrentAttempts(data.current_attempts || 0);
      setMaxAttempts(data.max_attempts || 1);
      setSubject(data.subject || "physics");
      setLoading(false);
    } catch (error: any) {
      console.error('Error loading review:', error);
      toast({
        title: "Error",
        description: "Failed to load review data.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const getLevelTitle = () => {
    const titles: { [key: string]: string } = {
      easy: "Easy Level",
      medium: "Medium Level",
      hard: "Hard Level"
    };
    return titles[level || 'easy'] || "Test Review";
  };

  const getLevelColor = () => {
    const colors: { [key: string]: string } = {
      easy: "from-green-500 to-emerald-500",
      medium: "from-blue-500 to-cyan-500",
      hard: "from-purple-500 to-pink-500"
    };
    return colors[level || 'easy'] || "from-gray-500 to-gray-600";
  };

  const handleRetakeTest = () => {
    const studentId = sessionStorage.getItem('studentId');
    navigate("/test", {
      state: {
        level,
        subject,
        studentId,
        retake: true
      }
    });
  };

  const handleAIReview = async (question: Question) => {
    if (!question.student_answer) return;

    const questionId = question.id;

    // Toggle expanded state
    if (aiReviews[questionId]?.expanded) {
      setAiReviews(prev => ({
        ...prev,
        [questionId]: { ...prev[questionId], expanded: false }
      }));
      return;
    }

    // If content already exists, just expand
    if (aiReviews[questionId]?.content) {
      setAiReviews(prev => ({
        ...prev,
        [questionId]: { ...prev[questionId], expanded: true }
      }));
      return;
    }

    // Initialize state for this question
    setAiReviews(prev => ({
      ...prev,
      [questionId]: { expanded: true, content: '', loading: true }
    }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const backendUrl = import.meta.env.VITE_BACKEND_URL;

      const response = await fetch(`${backendUrl}/api/ai-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          question: question.question_text,
          correct_answer: question.correct_answer,
          student_answer: question.student_answer,
          level: level,
          subject: subject,
          question_id: question.id  // Added for caching support
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI review');
      }

      const data = await response.json();
      const reviewText = data.review;
      const isCached = data.cached === true;

      // Clean up markdown formatting
      let cleanedText = reviewText
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/###\s*/g, '\n')
        .replace(/##\s*/g, '\n')
        .replace(/\n{3,}/g, '\n\n');

      // If cached, display instantly without typing effect
      if (isCached) {
        setAiReviews(prev => ({
          ...prev,
          [questionId]: { expanded: true, content: cleanedText, loading: false }
        }));
        return;
      }

      // Simulate typing effect only for newly generated reviews
      let currentText = '';
      const words = cleanedText.split(' ');

      for (let i = 0; i < words.length; i++) {
        currentText += (i > 0 ? ' ' : '') + words[i];
        setAiReviews(prev => ({
          ...prev,
          [questionId]: { expanded: true, content: currentText, loading: i < words.length - 1 }
        }));
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      setAiReviews(prev => ({
        ...prev,
        [questionId]: { expanded: true, content: cleanedText, loading: false }
      }));

    } catch (error: any) {
      console.error('Error generating AI review:', error);
      setAiReviews(prev => ({
        ...prev,
        [questionId]: {
          expanded: true,
          content: 'Failed to generate AI review. Please try again.',
          loading: false
        }
      }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const attemptedQuestions = questions.filter(q => q.student_answer);
  const correctAnswers = attemptedQuestions.filter(q => q.student_answer === q.correct_answer).length;
  const totalAttempted = attemptedQuestions.length;
  const scorePercentage = totalAttempted > 0 ? Math.round((correctAnswers / totalAttempted) * 100) : 0;
  const currentQ = questions[currentPage];
  const isAIExpanded = currentQ && aiReviews[currentQ.id]?.expanded;

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-sky-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="relative z-10 container max-w-7xl mx-auto px-4 py-8">

        {/* Top Row: Back to Levels + Score Card (Left) | AI Study Notes (Right) */}
        <div className="flex items-start justify-between mb-6">
          {/* Left: Back button + Score Card */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/levels", { state: { studentId: sessionStorage.getItem('studentId'), fromResults: true } })}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Levels
            </Button>

            {/* Score Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 px-4 py-2">
              <div className="flex items-center gap-4 text-sm">
                <div className="text-center">
                  <div className={`text-xl font-bold bg-gradient-to-r ${getLevelColor()} bg-clip-text text-transparent`}>
                    {scorePercentage}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Score</div>
                </div>
                <div className="w-px h-8 bg-gray-200 dark:bg-gray-600"></div>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-600">{correctAnswers}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Correct</div>
                </div>
                <div className="w-px h-8 bg-gray-200 dark:bg-gray-600"></div>
                <div className="text-center">
                  <div className="text-xl font-bold text-red-600">{totalAttempted - correctAnswers}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Wrong</div>
                </div>
                <div className="w-px h-8 bg-gray-200 dark:bg-gray-600"></div>
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-900 dark:text-white">{questions.length}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: AI Study Notes */}
          <div className="flex items-center gap-3">
            {canRetake && (
              <Button
                variant="outline"
                onClick={handleRetakeTest}
                className="border-orange-300 text-orange-600 hover:bg-orange-50"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retake ({currentAttempts + 1}/{maxAttempts})
              </Button>
            )}
            {levelAttempted && (
              <Button
                onClick={() => navigate(`/ai-notes/${level}`, { state: { studentId: sessionStorage.getItem('studentId'), subject: subject } })}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
              >
                <Brain className="w-4 h-4 mr-2" />
                AI Study Notes
              </Button>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        {currentQ && (
          <div className="relative">
            {/* Question Card with AI Review inside */}
            <Card className="border-2 shadow-xl bg-white dark:bg-gray-800 overflow-hidden relative">
              {/* Left: Question Content - Shrinks when AI Review is expanded */}
              <div className={`transition-all duration-500 ease-in-out ${isAIExpanded ? 'w-1/2 pr-0' : 'w-full'}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        {/* Left: Question badge + status */}
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-lg px-3 py-1 font-semibold">
                            Question {currentPage + 1} of {questions.length}
                          </Badge>
                          {currentQ.student_answer && (
                            <Badge
                              variant={currentQ.is_correct ? "default" : "destructive"}
                              className={`flex items-center gap-1 ${currentQ.is_correct
                                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                                }`}
                            >
                              {currentQ.is_correct ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4" />
                                  Correct
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-4 h-4" />
                                  Incorrect
                                </>
                              )}
                            </Badge>
                          )}
                          {!currentQ.student_answer && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <AlertCircle className="w-4 h-4" />
                              Not Attempted
                            </Badge>
                          )}
                        </div>

                        {/* Right: AI Review Button */}
                        {currentQ.student_answer && (
                          <Button
                            variant={isAIExpanded ? "secondary" : "default"}
                            size="sm"
                            onClick={() => handleAIReview(currentQ)}
                            disabled={aiReviews[currentQ.id]?.loading}
                            className={`${isAIExpanded
                              ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-800 dark:text-purple-200'
                              : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                              }`}
                          >
                            <Lightbulb className={`w-4 h-4 mr-1 ${aiReviews[currentQ.id]?.loading ? 'animate-pulse' : ''}`} />
                            {aiReviews[currentQ.id]?.loading
                              ? "Loading..."
                              : isAIExpanded
                                ? "Hide Review"
                                : "AI Review"
                            }
                          </Button>
                        )}
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-relaxed">
                        {currentQ.question_text}
                      </h2>

                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Student Answer */}
                  {currentQ.student_answer && (
                    <div className={`p-4 rounded-lg border-2 transition-all ${currentQ.is_correct
                      ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                      : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
                      }`}>
                      <p className="font-semibold mb-2 flex items-center gap-2">
                        {currentQ.is_correct ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        Your Answer:
                      </p>
                      <p className="text-foreground">{currentQ.student_answer}</p>
                    </div>
                  )}

                  {/* Correct Answer */}
                  <div className="p-4 rounded-lg border-2 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
                    <p className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-blue-600" />
                      Correct Answer:
                    </p>
                    <p className="text-foreground">{currentQ.correct_answer}</p>
                  </div>
                </CardContent>
              </div>

              {/* Right: AI Review Panel - Slides in from right with animation */}
              <div
                className={`absolute inset-y-0 right-0 w-1/2 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-l border-gray-200 dark:border-gray-700 p-6 flex flex-col overflow-hidden transition-transform duration-500 ease-in-out ${isAIExpanded ? 'translate-x-0' : 'translate-x-full'
                  }`}
              >
                <div className="flex items-center gap-3 mb-4 flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <Lightbulb className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-purple-900 dark:text-purple-100">AI Review</h3>
                    <p className="text-sm text-purple-600 dark:text-purple-300">Detailed Explanation</p>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto text-gray-700 dark:text-gray-300 leading-relaxed pr-2">
                  {aiReviews[currentQ.id]?.content?.split('\n').map((paragraph, idx) => (
                    paragraph.trim() && (
                      <p key={idx} className="mb-3">
                        {paragraph}
                      </p>
                    )
                  ))}
                  {aiReviews[currentQ.id]?.loading && (
                    <span className="inline-block w-2 h-5 ml-1 bg-purple-600 animate-pulse rounded"></span>
                  )}
                </div>
              </div>

            </Card>




            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <Button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                size="lg"
                variant="outline"
                className="bg-white dark:bg-gray-800"
              >
                <ChevronLeft className="mr-2 h-5 w-5" />
                Previous
              </Button>

              <div className="flex gap-2">
                {questions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(idx)}
                    className={`w-3 h-3 rounded-full transition-all ${idx === currentPage
                      ? `bg-gradient-to-r ${getLevelColor()} w-6`
                      : q.is_correct
                        ? 'bg-green-400'
                        : q.student_answer
                          ? 'bg-red-400'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    title={`Question ${idx + 1}`}
                  />
                ))}
              </div>

              <Button
                onClick={() => setCurrentPage(Math.min(questions.length - 1, currentPage + 1))}
                disabled={currentPage === questions.length - 1}
                size="lg"
                className={`bg-gradient-to-r ${getLevelColor()} text-white`}
              >
                Next
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!currentQ && (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground text-lg">No questions found for this level.</p>
              <Button
                className="mt-4"
                onClick={() => navigate("/levels", { state: { studentId: sessionStorage.getItem('studentId'), fromResults: true } })}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Levels
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Review;
