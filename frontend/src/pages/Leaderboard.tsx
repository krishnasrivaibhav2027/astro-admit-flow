import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ArrowLeft, Crown, Medal, Sparkles, Target, Timer, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface LeaderboardEntry {
  rank: number;
  student_name: string;
  total_score: number;
  total_time_minutes: number;
  levels_passed: number;
  email: string;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"hard" | "medium">("hard");
  const [hardLeaderboard, setHardLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [mediumLeaderboard, setMediumLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      // Check authentication first
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const studentId = sessionStorage.getItem('studentId');

      if (!token || !studentId) {
        navigate("/login");
        return;
      }

      loadLeaderboard();
    };

    checkAuth();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/leaderboard`);

      if (!response.ok) {
        throw new Error('Failed to load leaderboard');
      }

      const data = await response.json();
      setHardLeaderboard(data.hard_leaderboard);
      setMediumLeaderboard(data.medium_leaderboard);
      setLoading(false);
    } catch (error: any) {
      console.error('Error loading leaderboard:', error);
      toast({
        title: "Error",
        description: "Failed to load leaderboard data.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-400 drop-shadow-lg" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-slate-300 drop-shadow-lg" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600 drop-shadow-lg" />;
    return null;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-yellow-500/20";
    if (rank === 2) return "bg-gradient-to-br from-slate-300 to-slate-500 shadow-slate-500/20";
    if (rank === 3) return "bg-gradient-to-br from-amber-500 to-amber-700 shadow-amber-500/20";
    return "bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const currentLeaderboard = activeTab === "hard" ? hardLeaderboard : mediumLeaderboard;

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white selection:bg-emerald-500/30 transition-colors duration-300">
      {/* Animated Background - Dark Mode */}
      <div className="fixed inset-0 pointer-events-none hidden dark:block">
        <div className="absolute top-[-20%] left-[20%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] animate-pulse delay-1000" />
      </div>

      {/* Animated Background - Light Mode */}
      <div className="fixed inset-0 pointer-events-none dark:hidden">
        <div className="absolute top-[-20%] left-[20%] w-[50%] h-[50%] rounded-full bg-emerald-500/5 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px] animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 container max-w-6xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Button
            variant="ghost"
            onClick={() => navigate("/levels")}
            className="mb-8 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 transition-all group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Levels
          </Button>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full" />
              <Trophy className="w-16 h-16 text-yellow-500 dark:text-yellow-400 relative z-10" />
            </div>
            <h1 className="text-5xl font-bold text-slate-900 dark:text-white tracking-tight">
              Leader<span className="text-emerald-600 dark:text-emerald-400">board</span>
            </h1>
          </div>
          <p className="text-xl text-slate-600 dark:text-slate-400">
            Top performers ranked by score and speed
          </p>
        </motion.div>

        {/* Tab Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex gap-4 mb-12 justify-center"
        >
          <Button
            size="lg"
            variant="ghost"
            onClick={() => setActiveTab("hard")}
            className={`relative px-8 py-6 text-lg transition-all duration-300 ${activeTab === "hard"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/50 shadow-lg shadow-emerald-500/20"
              : "bg-white/50 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-emerald-500/5 hover:text-emerald-600 dark:hover:text-emerald-400"
              }`}
          >
            <Crown className={`w-5 h-5 mr-3 ${activeTab === "hard" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"}`} />
            Hard Level Champions
            <Badge className={`ml-3 ${activeTab === "hard" ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
              {hardLeaderboard.length}
            </Badge>
          </Button>
          <Button
            size="lg"
            variant="ghost"
            onClick={() => setActiveTab("medium")}
            className={`relative px-8 py-6 text-lg transition-all duration-300 ${activeTab === "medium"
              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/50 shadow-lg shadow-blue-500/20"
              : "bg-white/50 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-blue-500/5 hover:text-blue-600 dark:hover:text-blue-400"
              }`}
          >
            <Medal className={`w-5 h-5 mr-3 ${activeTab === "medium" ? "text-blue-600 dark:text-blue-400" : "text-slate-500"}`} />
            Medium Level Stars
            <Badge className={`ml-3 ${activeTab === "medium" ? "bg-blue-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
              {mediumLeaderboard.length}
            </Badge>
          </Button>
        </motion.div>

        {/* Leaderboard List */}
        {currentLeaderboard.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-white/50 dark:bg-white/5 backdrop-blur-xl border-slate-200 dark:border-white/10 border-dashed">
              <CardContent className="p-16 text-center">
                <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trophy className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No Entries Yet</h3>
                <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  Be the first to complete the {activeTab} level and claim your spot on the leaderboard!
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {currentLeaderboard.map((entry, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card
                  className={`bg-white dark:bg-white/5 backdrop-blur-xl border-slate-200 dark:border-white/10 overflow-hidden relative group hover:border-emerald-500/30 transition-all duration-300 ${entry.rank <= 3 ? 'bg-slate-50/50 dark:bg-white/10' : ''
                    }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-10 transition-opacity duration-500 ${entry.rank === 1 ? 'from-yellow-500/10 to-transparent' :
                    entry.rank === 2 ? 'from-slate-400/10 to-transparent' :
                      entry.rank === 3 ? 'from-amber-600/10 to-transparent' :
                        'from-emerald-500/10 to-transparent'
                    }`} />

                  <CardContent className="p-6 flex items-center gap-6 relative z-10">
                    {/* Rank */}
                    <div className={`w-16 h-16 rounded-2xl ${getRankColor(entry.rank)} flex items-center justify-center flex-shrink-0 shadow-lg transform group-hover:scale-105 transition-transform duration-300`}>
                      {getRankIcon(entry.rank) || (
                        <span className="text-2xl font-bold text-slate-300">#{entry.rank}</span>
                      )}
                    </div>

                    {/* Student Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {entry.student_name}
                        </h3>
                        {entry.rank <= 3 && (
                          <Sparkles className="w-4 h-4 text-yellow-500 dark:text-yellow-400 animate-pulse" />
                        )}
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{entry.email}</p>
                    </div>

                    {/* Stats Grid */}
                    <div className="flex gap-8 md:gap-12">
                      <div className="text-center group/stat">
                        <div className="flex items-center gap-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1 group-hover/stat:scale-110 transition-transform">
                          <Target className="w-5 h-5" />
                          {entry.total_score}
                        </div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Score</p>
                      </div>

                      <div className="text-center group/stat">
                        <div className="flex items-center gap-2 text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1 group-hover/stat:scale-110 transition-transform">
                          <Timer className="w-5 h-5" />
                          {entry.total_time_minutes}m
                        </div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Time</p>
                      </div>

                      <div className="text-center group/stat hidden sm:block">
                        <div className="flex items-center gap-2 text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1 group-hover/stat:scale-110 transition-transform">
                          <Crown className="w-5 h-5" />
                          {entry.levels_passed}
                        </div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Levels</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
