import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

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
    const colors: { [key: string]: { bg: string, text: string, dot: string } } = {
      easy: { bg: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
      medium: { bg: "bg-blue-500", text: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500" },
      hard: { bg: "bg-purple-500", text: "text-purple-600 dark:text-purple-400", dot: "bg-purple-500" }
    };
    return colors[level || 'easy'] || { bg: "bg-gray-500", text: "text-gray-600 dark:text-gray-400", dot: "bg-gray-500" };
  };

  const getTimelineColors = () => {
    return [
      { dot: "bg-purple-500", label: "text-purple-600 dark:text-purple-400" },
      { dot: "bg-blue-500", label: "text-blue-600 dark:text-blue-400" },
      { dot: "bg-green-500", label: "text-green-600 dark:text-green-400" },
      { dot: "bg-yellow-500", label: "text-yellow-600 dark:text-yellow-400" },
      { dot: "bg-red-500", label: "text-red-600 dark:text-red-400" },
      { dot: "bg-pink-500", label: "text-pink-600 dark:text-pink-400" },
      { dot: "bg-indigo-500", label: "text-indigo-600 dark:text-indigo-400" },
      { dot: "bg-cyan-500", label: "text-cyan-600 dark:text-cyan-400" },
    ];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-500 mx-auto"></div>
          <div className="space-y-2">
            <p className="text-xl font-semibold flex items-center justify-center gap-2 text-gray-900 dark:text-white">
              <Brain className="w-6 h-6 animate-pulse" />
              AI is analyzing your weak areas...
            </p>
            <p className="text-gray-500 dark:text-slate-400">Generating personalized study notes</p>
          </div>
        </div>
      </div>
    );
  }

  const levelColors = getLevelColor();
  const timelineColors = getTimelineColors();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800 text-gray-900 dark:text-white px-4 py-8 lg:px-12">
      <div className="w-full max-w-screen-2xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-8 text-gray-500 hover:text-gray-900 hover:bg-gray-200 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700"
          onClick={() => navigate(`/review/${level}`, { state: { studentId: sessionStorage.getItem('studentId'), subject: subject } })}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Review
        </Button>

        {/* Timeline Header */}
        <div className="flex items-center gap-6 mb-16">
          <div className={`w-16 h-16 rounded-full ${levelColors.bg} flex items-center justify-center shadow-lg`}>
            <Brain className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
              {getLevelTitle()} • AI STUDY NOTES
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {incorrectCount > 0 ? `${incorrectCount} Topics to Review` : 'Performance Summary'}
            </h1>
          </div>
        </div>

        {/* No incorrect answers - Perfect Performance */}
        {topicNotes.length === 0 && (
          <div className="relative pl-12">
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-slate-700"></div>
            <div className="relative">
              <div className="absolute -left-12 w-4 h-4 rounded-full bg-green-500 border-4 border-gray-50 dark:border-slate-900"></div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-8 border border-gray-200 dark:border-slate-700 text-center shadow-lg">
                <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-500/20 mx-auto flex items-center justify-center mb-4">
                  <Sparkles className="w-10 h-10 text-green-500 dark:text-green-400" />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Perfect Performance! 🎉</h3>
                <p className="text-gray-500 dark:text-slate-400">
                  You answered all questions correctly. No weak areas identified!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        {topicNotes.length > 0 && (
          <div className="relative pl-12 space-y-12">
            {/* Vertical Line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-slate-700"></div>

            {topicNotes.map((topicNote, index) => {
              const color = timelineColors[index % timelineColors.length];

              return (
                <div key={index} className="relative">
                  {/* Timeline Dot */}
                  <div className={`absolute -left-12 w-4 h-4 rounded-full ${color.dot} border-4 border-gray-50 dark:border-slate-900 ${topicNote.isTyping ? 'animate-pulse' : ''}`}></div>

                  {/* Content Card */}
                  <div className={`bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden shadow-lg ${topicNote.isTyping ? 'ring-2 ring-purple-500/50' : ''}`}>
                    {/* Card Header */}
                    <div className="p-6 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                      <div className={`text-xs ${color.label} mb-2 flex items-center gap-2 uppercase tracking-wider font-semibold`}>
                        <BookOpen className="w-3 h-3" />
                        TOPIC {index + 1}
                        {topicNote.isTyping && (
                          <Badge variant="secondary" className="ml-2 animate-pulse bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 border-purple-200 dark:border-purple-500/30">
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI is typing...
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{topicNote.topic}</h3>

                      {/* Related Questions */}
                      <div className="flex flex-wrap gap-2">
                        {topicNote.related_questions.map((question, qIdx) => (
                          <span
                            key={qIdx}
                            className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300"
                          >
                            {question}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Card Content - Notes */}
                    <div className="p-6">
                      {topicNote.displayedNotes ? (
                        <div className="text-gray-600 dark:text-slate-300 leading-relaxed space-y-4">
                          {topicNote.displayedNotes.split('\n\n').map((paragraph, pIdx) => (
                            paragraph.trim() && (
                              <p key={pIdx}>
                                {paragraph}
                              </p>
                            )
                          ))}
                          {topicNote.isTyping && (
                            <span className="inline-block w-2 h-4 ml-1 bg-purple-500 animate-pulse rounded"></span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-8 text-gray-400 dark:text-slate-500">
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500"></div>
                            <span>Waiting to generate...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Summary Item at End */}
            <div className="relative">
              <div className="absolute -left-12 w-4 h-4 rounded-full bg-emerald-500 border-4 border-gray-50 dark:border-slate-900"></div>
              <div className="bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-900/50 dark:to-slate-800 rounded-lg p-6 border border-emerald-200 dark:border-emerald-700/50 shadow-lg">
                <div className="text-xs text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-2 uppercase tracking-wider font-semibold">
                  <Lightbulb className="w-3 h-3" />
                  SUMMARY
                </div>
                <p className="text-gray-600 dark:text-slate-300">
                  Focus on understanding these {topicNotes.length} topic{topicNotes.length > 1 ? 's' : ''} to improve your performance.
                  Review the concepts above and practice similar questions.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Back Button at Bottom */}
        <div className="mt-12 flex justify-center">
          <Button
            size="lg"
            onClick={() => navigate(`/review/${level}`, { state: { studentId: sessionStorage.getItem('studentId'), subject: subject } })}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white px-8"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Review
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AINotesPage;
