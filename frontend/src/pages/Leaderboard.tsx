import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ArrowLeft, Crown, Flame, Star, Trophy, User, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface ScoreBreakdown {
  difficulty_weighted: number;
  time_efficiency: number;
  attempt_efficiency: number;
  bonuses: number;
  bonus_details: string[];
}

interface TimeFormatted {
  value: number;
  unit: string;
  display: string;
}

interface LeaderboardEntry {
  rank: number;
  student_name: string;
  email: string;
  composite_score: number;
  total_score: number;
  score_breakdown?: ScoreBreakdown;
  total_time?: TimeFormatted;
  total_time_seconds?: number;
  total_time_minutes?: number;
  levels_passed: number;
  highest_level?: string;
  is_passed?: boolean;
  concession?: number;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<'week' | 'month' | 'all'>('all');

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const studentId = sessionStorage.getItem('studentId');

      if (!token || !studentId) {
        navigate("/login");
        return;
      }

      setCurrentStudentId(studentId);
      loadLeaderboard();
    };

    checkAuth();
  }, []);

  // Reload when time period changes
  useEffect(() => {
    if (currentStudentId) {
      loadLeaderboard(timePeriod);
    }
  }, [timePeriod]);

  const loadLeaderboard = async (period: string = 'all') => {
    try {
      setLoading(true);
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/leaderboard?time_period=${period}`);

      if (!response.ok) {
        throw new Error('Failed to load leaderboard');
      }

      const data = await response.json();
      const unified = data.leaderboard || [...(data.hard_leaderboard || []), ...(data.medium_leaderboard || [])];
      setLeaderboard(unified);
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

  const getTierBadge = (highestLevel?: string) => {
    switch (highestLevel) {
      case 'hard':
        return { label: "Champion", icon: Trophy, color: "bg-purple-500 text-white", textColor: "text-purple-600" };
      case 'medium':
        return { label: "Star", icon: Star, color: "bg-blue-500 text-white", textColor: "text-blue-600" };
      case 'easy':
        return { label: "Rising", icon: Zap, color: "bg-emerald-500 text-white", textColor: "text-emerald-600" };
      default:
        return { label: "Newcomer", icon: User, color: "bg-slate-500 text-white", textColor: "text-slate-600" };
    }
  };

  const formatTime = (entry: LeaderboardEntry) => {
    if (entry.total_time?.display) {
      return entry.total_time.display;
    }
    if (entry.total_time_minutes !== undefined) {
      return `${entry.total_time_minutes}m`;
    }
    return '0m';
  };

  // Find current user's position
  const currentUserEntry = leaderboard.find(e =>
    e.email === sessionStorage.getItem('user_email') ||
    e.student_name.toLowerCase().includes('vaibhu') // Fallback
  );
  const currentUserRank = currentUserEntry?.rank || 0;
  const pointsToTop10 = currentUserRank > 10 && leaderboard[9]
    ? Math.ceil(leaderboard[9].composite_score - (currentUserEntry?.composite_score || 0))
    : 0;

  const top3 = leaderboard.slice(0, 3);
  const restOfLeaderboard = leaderboard.slice(3);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Button
            variant="ghost"
            onClick={() => navigate("/levels")}
            className="mb-6 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-500/10 transition-all group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Levels
          </Button>
        </motion.div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Leaderboard</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setTimePeriod('week')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${timePeriod === 'week'
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
            >
              This Week
            </button>
            <button
              onClick={() => setTimePeriod('month')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${timePeriod === 'month'
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
            >
              This Month
            </button>
            <button
              onClick={() => setTimePeriod('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${timePeriod === 'all'
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
            >
              All Time
            </button>
          </div>
        </div>

        {/* Motivational Banner with Floating Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative mb-10"
        >
          <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 border-0 overflow-hidden">
            <CardContent className="p-8 relative">
              {/* Floating Badges */}
              <div className="absolute right-4 top-4 flex flex-wrap gap-2 max-w-[200px] opacity-80">
                <Badge className="bg-emerald-400 text-white text-xs">🏆 Champion</Badge>
                <Badge className="bg-blue-400 text-white text-xs">⭐ Star</Badge>
                <Badge className="bg-purple-400 text-white text-xs">🎯 Rising</Badge>
                <Badge className="bg-pink-400 text-white text-xs">🔥 Fast Learner</Badge>
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">
                {currentUserRank <= 10
                  ? "🎉 You're in the Top 10!"
                  : "You're closer than you think!"}
              </h2>
              <p className="text-indigo-100 mb-4">
                {currentUserRank <= 10
                  ? "Keep up the great work to maintain your position!"
                  : pointsToTop10 > 0
                    ? `Just ${pointsToTop10} points away from breaking into the Top 10!`
                    : "Complete more levels to climb the leaderboard!"}
              </p>
              <Button
                onClick={() => navigate("/levels")}
                variant="outline"
                className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20"
              >
                Continue Learning
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top 3 Podium */}
        {top3.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10"
          >
            {top3.map((entry, index) => {
              const tier = getTierBadge(entry.highest_level);
              const TierIcon = tier.icon;
              const podiumOrder = [1, 0, 2]; // 2nd, 1st, 3rd for visual arrangement
              const displayIndex = podiumOrder[index];

              return (
                <motion.div
                  key={entry.email}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                  className={`${displayIndex === 0 ? 'md:order-2' : displayIndex === 1 ? 'md:order-1' : 'md:order-3'}`}
                >
                  <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl ${entry.rank === 1
                    ? 'bg-gradient-to-b from-yellow-50 to-white dark:from-yellow-900/20 dark:to-slate-900 border-yellow-200 dark:border-yellow-700 md:scale-105'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                    }`}>
                    <CardContent className="p-6 text-center">
                      {/* Rank Badge */}
                      <div className={`absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${entry.rank === 1 ? 'bg-yellow-500' : entry.rank === 2 ? 'bg-slate-400' : 'bg-amber-600'
                        }`}>
                        {entry.rank === 1 ? <Crown className="w-4 h-4" /> : entry.rank}
                      </div>

                      {/* Score */}
                      <div className="absolute top-3 right-3 flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span className="font-bold text-slate-900 dark:text-white">{entry.composite_score}</span>
                      </div>

                      {/* Avatar */}
                      <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center text-2xl font-bold ${entry.rank === 1
                        ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white'
                        : entry.rank === 2
                          ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-white'
                          : 'bg-gradient-to-br from-amber-400 to-amber-600 text-white'
                        }`}>
                        {entry.student_name.charAt(0).toUpperCase()}
                      </div>

                      {/* Name */}
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">{entry.student_name}</h3>

                      {/* Stats */}
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                        {entry.levels_passed} levels completed • <Flame className="w-3 h-3 inline text-orange-500" /> {formatTime(entry)}
                      </p>

                      {/* Badges */}
                      <div className="flex flex-wrap justify-center gap-1">
                        <Badge className={`text-xs ${tier.color}`}>
                          <TierIcon className="w-3 h-3 mr-1" />
                          {tier.label}
                        </Badge>
                        {entry.score_breakdown?.bonuses > 0 && (
                          <Badge variant="outline" className="text-xs border-yellow-300 text-yellow-600">
                            +{entry.score_breakdown.bonuses.toFixed(1)} bonus
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Table-Style Leaderboard for Ranks 4+ */}
        {restOfLeaderboard.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-500 dark:text-slate-400">
                <div className="col-span-1">Rank</div>
                <div className="col-span-3">User</div>
                <div className="col-span-2">Levels</div>
                <div className="col-span-2">Time</div>
                <div className="col-span-2">Badge</div>
                <div className="col-span-2 text-right">Points</div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {restOfLeaderboard.map((entry) => {
                  const tier = getTierBadge(entry.highest_level);
                  const TierIcon = tier.icon;
                  const isCurrentUser = entry.email === sessionStorage.getItem('user_email');

                  return (
                    <div
                      key={entry.email}
                      className={`grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors ${isCurrentUser
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                    >
                      {/* Rank */}
                      <div className="col-span-1 font-semibold text-slate-600 dark:text-slate-400">
                        {entry.rank}
                      </div>

                      {/* User */}
                      <div className="col-span-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold">
                          {entry.student_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {entry.student_name}
                            {isCurrentUser && <span className="ml-2 text-indigo-500 text-sm">(You)</span>}
                          </p>
                        </div>
                      </div>

                      {/* Levels */}
                      <div className="col-span-2 text-slate-600 dark:text-slate-400">
                        {entry.levels_passed} levels
                      </div>

                      {/* Time */}
                      <div className="col-span-2 flex items-center gap-1 text-slate-600 dark:text-slate-400">
                        <Flame className="w-4 h-4 text-orange-500" />
                        {formatTime(entry)}
                      </div>

                      {/* Badge */}
                      <div className="col-span-2 flex flex-wrap gap-1">
                        <Badge className={`text-xs ${tier.color}`}>
                          <TierIcon className="w-3 h-3 mr-1" />
                          {tier.label}
                        </Badge>
                      </div>

                      {/* Points */}
                      <div className="col-span-2 text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <span className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400">
                                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                {entry.composite_score}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="bg-slate-900 text-white p-3">
                              {entry.score_breakdown ? (
                                <div className="text-xs space-y-1">
                                  <p className="text-emerald-400 font-semibold mb-2">Score Breakdown</p>
                                  <div className="flex justify-between gap-4"><span>Difficulty</span><span>{entry.score_breakdown.difficulty_weighted.toFixed(1)}</span></div>
                                  <div className="flex justify-between gap-4"><span>Time</span><span>{entry.score_breakdown.time_efficiency.toFixed(1)}</span></div>
                                  <div className="flex justify-between gap-4"><span>Efficiency</span><span>{entry.score_breakdown.attempt_efficiency.toFixed(1)}</span></div>
                                  {entry.score_breakdown.bonuses > 0 && (
                                    <div className="flex justify-between gap-4 text-yellow-400"><span>Bonuses</span><span>+{entry.score_breakdown.bonuses.toFixed(1)}</span></div>
                                  )}
                                </div>
                              ) : (
                                <p>Composite score</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Empty State */}
        {leaderboard.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
              <CardContent className="p-16 text-center">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trophy className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No Entries Yet</h3>
                <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  Be the first to complete a level and claim your spot!
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
