import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, BookOpen, Brain, Lightbulb, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

interface TopicNote {
  topic: string;
  related_questions: string[];
  notes: string;
  displayedNotes?: string;
  isTyping?: boolean;
}

const AINotesPage = () => {
  const navigate = useNavigate();
  const { level } = useParams<{ level: string }>();
  const location = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [topicNotes, setTopicNotes] = useState<TopicNote[]>([]);
  const [incorrectCount, setIncorrectCount] = useState(0);

  // Get subject from state, default to physics if missing (though it should be passed)
  const locationState = location.state || {};
  const subject = locationState.subject;

  useEffect(() => {
    generateNotes();
  }, [level, subject]);

  const generateNotes = async () => {
    try {
      setLoading(true);
      setGenerating(true);

      const studentId = sessionStorage.getItem('studentId');
      const token = localStorage.getItem('firebase_token');

      if (!studentId || !token) {
        toast({
          title: "Authentication Required",
          description: "Please login to generate notes.",
          variant: "destructive"
        });
        navigate("/login");
        return;
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const url = new URL(`${backendUrl}/api/ai-notes/${level}/${studentId}`);
      if (subject) {
        url.searchParams.append('subject', subject);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI notes');
      }

      const data = await response.json();

      // If no incorrect answers, just set empty and finish
      if (!data.topic_notes || data.topic_notes.length === 0) {
        setTopicNotes([]);
        setIncorrectCount(0);
        setLoading(false);
        setGenerating(false);
        return;
      }

      // Check if notes are cached
      const isCached = data.cached === true;

      // Clean markdown
      const cleanedNotes = data.topic_notes.map((note: any) => ({
        ...note,
        notes: note.notes
          .replace(/\*\*/g, '') // Remove bold markdown
          .replace(/\*/g, '')   // Remove italic markdown
          .replace(/###\s*/g, '\n') // Convert headers
          .replace(/##\s*/g, '\n')
          .replace(/\n{3,}/g, '\n\n'), // Remove excessive newlines
        displayedNotes: isCached ? note.notes.replace(/\*\*/g, '').replace(/\*/g, '').replace(/###\s*/g, '\n').replace(/##\s*/g, '\n').replace(/\n{3,}/g, '\n\n') : '',
        isTyping: false
      }));

      setTopicNotes(cleanedNotes);
      setIncorrectCount(data.incorrect_count);
      setLoading(false);

      if (isCached) {
        // Cached notes - show immediately without animation
        setGenerating(false);
      } else {
        // New notes - start typing animation
        animateNotes(cleanedNotes);
      }
    } catch (error: any) {
      console.error('Error generating notes:', error);

      // Don't show error if it's just no incorrect questions
      if (error.message && error.message.includes('No questions found')) {
        setTopicNotes([]);
        setIncorrectCount(0);
        setLoading(false);
        setGenerating(false);
        return;
      }

      toast({
        title: "Error",
        description: "Failed to generate AI notes. Please try again.",
        variant: "destructive"
      });
      setLoading(false);
      setGenerating(false);
    }
  };

  const animateNotes = async (notes: TopicNote[]) => {
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];

      // Mark as typing
      setTopicNotes(prev =>
        prev.map((n, idx) => idx === i ? { ...n, isTyping: true } : n)
      );

      // Animate word by word
      const words = note.notes.split(' ');
      let displayedText = '';

      for (let j = 0; j < words.length; j++) {
        displayedText += (j > 0 ? ' ' : '') + words[j];

        setTopicNotes(prev =>
          prev.map((n, idx) => idx === i ? { ...n, displayedNotes: displayedText } : n)
        );

        // Delay between words (faster for better UX)
        await new Promise(resolve => setTimeout(resolve, 30));
      }

      // Mark as done typing
      setTopicNotes(prev =>
        prev.map((n, idx) => idx === i ? { ...n, isTyping: false, displayedNotes: note.notes } : n)
      );
    }

    setGenerating(false);
  };

  const getLevelTitle = () => {
    const titles: { [key: string]: string } = {
      easy: "Easy Level",
      medium: "Medium Level",
      hard: "Hard Level"
    };
    return titles[level || 'easy'] || "Test Notes";
  };

  const getLevelColor = () => {
    const colors: { [key: string]: string } = {
      easy: "from-green-500 to-emerald-500",
      medium: "from-blue-500 to-cyan-500",
      hard: "from-purple-500 to-pink-500"
    };
    return colors[level || 'easy'] || "from-gray-500 to-gray-600";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto"></div>
          <div className="space-y-2">
            <p className="text-xl font-semibold flex items-center justify-center gap-2">
              <Brain className="w-6 h-6 animate-pulse" />
              AI is analyzing your weak areas...
            </p>
            <p className="text-muted-foreground">Generating personalized study notes</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="relative z-10 container max-w-6xl mx-auto px-4 py-12">
        <Button
          variant="ghost"
          onClick={() => navigate(`/review/${level}`, { state: { studentId: sessionStorage.getItem('studentId'), subject: subject } })}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Review
        </Button>

        {/* Header */}
        <Card className="mb-8 border-2 border-purple-200 dark:border-purple-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getLevelColor()} flex items-center justify-center`}>
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  {getLevelTitle()} - AI Study Notes
                </CardTitle>
              </div>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                <Sparkles className="w-4 h-4 mr-2" />
                {incorrectCount} Topics to Review
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              AI has analyzed your incorrect answers and generated personalized notes to help you improve in your weak areas.
            </p>
          </CardContent>
        </Card>

        {/* No incorrect answers */}
        {
          topicNotes.length === 0 && (
            <Card className="border-2 border-green-200 dark:border-green-800">
              <CardContent className="p-12 text-center">
                <div className="space-y-4">
                  <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900 mx-auto flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold">Perfect Performance! 🎉</h3>
                  <p className="text-muted-foreground">
                    You answered all questions correctly. No weak areas identified!
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        }

        {/* Topic Notes */}
        <div className="space-y-6">
          {topicNotes.map((topicNote, index) => (
            <Card key={index} className={`border-2 hover:shadow-xl transition-shadow ${topicNote.isTyping ? 'ring-2 ring-purple-500 ring-opacity-50' : ''}`}>
              <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center ${topicNote.isTyping ? 'animate-pulse' : ''}`}>
                        <BookOpen className="w-5 h-5 text-white" />
                      </div>
                      <CardTitle className="text-2xl">{topicNote.topic}</CardTitle>
                      {topicNote.isTyping && (
                        <Badge variant="secondary" className="animate-pulse">
                          <Sparkles className="w-3 h-3 mr-1" />
                          AI is typing...
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {topicNote.related_questions.map((question, qIdx) => (
                        <Badge key={qIdx} variant="outline" className="text-xs">
                          {question}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" />
                    {topicNote.related_questions.length} Question{topicNote.related_questions.length > 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {topicNote.displayedNotes ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    {topicNote.displayedNotes.split('\n\n').map((paragraph, pIdx) => (
                      paragraph.trim() && (
                        <p key={pIdx} className="mb-4 leading-relaxed text-foreground">
                          {paragraph}
                        </p>
                      )
                    ))}
                    {topicNote.isTyping && (
                      <span className="inline-block w-2 h-4 ml-1 bg-purple-600 animate-pulse"></span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500"></div>
                      <span>Waiting to generate...</span>
                    </div>
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
            onClick={() => navigate(`/review/${level}`, { state: { studentId: sessionStorage.getItem('studentId'), subject: subject } })}
            className="px-8"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Review
          </Button>
        </div>
      </div >
    </div >
  );
};

export default AINotesPage;
