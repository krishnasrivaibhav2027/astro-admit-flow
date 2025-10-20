import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, Lightbulb, RotateCcw } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";

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
  const { level } = useParams<{ level: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [levelAttempted, setLevelAttempted] = useState(false);
  const [aiReviews, setAiReviews] = useState<AIReviewState>({});
  const [canRetake, setCanRetake] = useState(false);
  const [currentAttempts, setCurrentAttempts] = useState(0);
  const [maxAttempts, setMaxAttempts] = useState(1);

  useEffect(() => {
    loadReviewData();
  }, [level]);

  const loadReviewData = async () => {
    try {
      const studentId = sessionStorage.getItem('studentId');
      const token = localStorage.getItem('firebase_token');

      if (!studentId || !token) {
        toast({
          title: "Authentication Required",
          description: "Please login to view review.",
          variant: "destructive"
        });
        navigate("/login");
        return;
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/review/${level}/${studentId}`, {
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
      const token = localStorage.getItem('firebase_token');
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
          level: level
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI review');
      }

      const data = await response.json();
      const reviewText = data.review;

      // Clean up markdown formatting (remove asterisks, format headers)
      let cleanedText = reviewText
        .replace(/\*\*/g, '') // Remove bold markdown
        .replace(/\*/g, '')   // Remove italic markdown
        .replace(/###\s*/g, '\n') // Convert ### headers to newlines
        .replace(/##\s*/g, '\n')  // Convert ## headers to newlines
        .replace(/\n{3,}/g, '\n\n'); // Remove excessive newlines

      // Simulate typing effect
      let currentText = '';
      const words = cleanedText.split(' ');
      
      for (let i = 0; i < words.length; i++) {
        currentText += (i > 0 ? ' ' : '') + words[i];
        setAiReviews(prev => ({
          ...prev,
          [questionId]: { expanded: true, content: currentText, loading: i < words.length - 1 }
        }));
        
        // Delay between words for typing effect
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
  const correctAnswers = attemptedQuestions.filter(q => q.is_correct).length;
  const totalAttempted = attemptedQuestions.length;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-purple-50 to-blue-50 dark:from-background dark:via-purple-950/20 dark:to-blue-950/20" />
      
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ModeToggle />
      </div>

      {/* Content */}
      <div className="relative z-10 container max-w-6xl mx-auto px-4 py-12">
        <Button
          variant="ghost"
          onClick={() => navigate("/levels", { state: { studentId: sessionStorage.getItem('studentId') } })}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Levels
        </Button>

        {/* Header */}
        <Card className="mb-8 border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getLevelColor()} flex items-center justify-center`}>
                    <span className="text-white text-xl font-bold">
                      {level?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {getLevelTitle()} - Detailed Review
                </CardTitle>
              </div>
              {levelAttempted && (
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  Score: {correctAnswers}/{totalAttempted}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {levelAttempted 
                ? `Review your answers and learn from AI-generated explanations.`
                : `This level was not attempted. Review the correct answers below.`
              }
            </p>
          </CardContent>
        </Card>

        {/* Questions Review */}
        <div className="space-y-6">
          {questions.map((question, index) => (
            <Card key={question.id} className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="outline" className="text-lg px-3 py-1">
                        Question {index + 1}
                      </Badge>
                      {question.student_answer && (
                        <Badge 
                          variant={question.is_correct ? "default" : "destructive"}
                          className="flex items-center gap-1"
                        >
                          {question.is_correct ? (
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
                      {!question.student_answer && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          Not Attempted
                        </Badge>
                      )}
                    </div>
                    <p className="text-lg font-medium">{question.question_text}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Student Answer (if attempted) */}
                {question.student_answer && (
                  <div className={`p-4 rounded-lg border-2 ${
                    question.is_correct 
                      ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
                      : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
                  }`}>
                    <p className="font-semibold mb-2 flex items-center gap-2">
                      {question.is_correct ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      Your Answer:
                    </p>
                    <p className="text-foreground">{question.student_answer}</p>
                  </div>
                )}

                {/* Correct Answer */}
                <div className="p-4 rounded-lg border-2 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
                  <p className="font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    Correct Answer:
                  </p>
                  <p className="text-foreground">{question.correct_answer}</p>
                </div>

                {/* AI Review Button and Content (for attempted questions) */}
                {question.student_answer && (
                  <div>
                    <Button
                      variant={aiReviews[question.id]?.expanded ? "secondary" : "default"}
                      className="w-full"
                      onClick={() => handleAIReview(question)}
                      disabled={aiReviews[question.id]?.loading}
                    >
                      <Lightbulb className="w-4 h-4 mr-2" />
                      {aiReviews[question.id]?.loading 
                        ? "AI is typing..." 
                        : aiReviews[question.id]?.expanded 
                          ? "Hide AI Review" 
                          : "Get AI Review"
                      }
                    </Button>

                    {/* AI Review Content with Typing Animation */}
                    {aiReviews[question.id]?.expanded && (
                      <div className="mt-4 p-4 rounded-lg border-2 bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800 animate-in slide-in-from-top-2">
                        <p className="font-semibold mb-2 flex items-center gap-2">
                          <Lightbulb className="w-5 h-5 text-purple-600 animate-pulse" />
                          AI Detailed Review:
                        </p>
                        <div className="text-foreground leading-relaxed">
                          {aiReviews[question.id]?.content.split('\n').map((paragraph, idx) => (
                            paragraph.trim() && (
                              <p key={idx} className="mb-3">
                                {paragraph}
                              </p>
                            )
                          ))}
                          {aiReviews[question.id]?.loading && (
                            <span className="inline-block w-2 h-4 ml-1 bg-purple-600 animate-pulse"></span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Back Button */}
        <div className="mt-8 flex justify-center">
          <Button
            size="lg"
            onClick={() => navigate("/levels", { state: { studentId: sessionStorage.getItem('studentId') } })}
            className="px-8"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Levels
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Review;
