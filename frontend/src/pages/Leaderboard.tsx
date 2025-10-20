import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Trophy, Crown, Medal, Timer, Target } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";

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
    loadLeaderboard();
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
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
    return null;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "from-yellow-500 to-orange-500";
    if (rank === 2) return "from-gray-400 to-gray-600";
    if (rank === 3) return "from-amber-600 to-amber-800";
    return "from-blue-500 to-purple-500";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentLeaderboard = activeTab === "hard" ? hardLeaderboard : mediumLeaderboard;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-purple-50 to-blue-50 dark:from-background dark:via-purple-950/20 dark:to-blue-950/20" />
      
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ModeToggle />
      </div>

      {/* Content */}
      <div className="relative z-10 container max-w-5xl mx-auto px-4 py-12">
        <Button
          variant="ghost"
          onClick={() => navigate("/levels", { state: { studentId: sessionStorage.getItem('studentId'), fromResults: true } })}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Levels
        </Button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="w-12 h-12 text-yellow-500" />
            <h1 className="text-5xl font-bold">
              Leaderboard
            </h1>
          </div>
          <p className="text-xl text-muted-foreground">
            Top performers ranked by score and speed
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-4 mb-8 justify-center">
          <Button
            size="lg"
            variant={activeTab === "hard" ? "default" : "outline"}
            onClick={() => setActiveTab("hard")}
            className={activeTab === "hard" ? "bg-gradient-to-r from-purple-500 to-pink-500" : ""}
          >
            <Crown className="w-5 h-5 mr-2" />
            Hard Level Champions ({hardLeaderboard.length})
          </Button>
          <Button
            size="lg"
            variant={activeTab === "medium" ? "default" : "outline"}
            onClick={() => setActiveTab("medium")}
            className={activeTab === "medium" ? "bg-gradient-to-r from-blue-500 to-cyan-500" : ""}
          >
            <Medal className="w-5 h-5 mr-2" />
            Medium Level Stars ({mediumLeaderboard.length})
          </Button>
        </div>

        {/* Leaderboard */}
        {currentLeaderboard.length === 0 ? (
          <Card className="border-2">
            <CardContent className="p-12 text-center">
              <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Entries Yet</h3>
              <p className="text-muted-foreground">
                Be the first to complete the {activeTab} level and appear on the leaderboard!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {currentLeaderboard.map((entry, index) => (
              <Card 
                key={index} 
                className={`border-2 hover:shadow-xl transition-all ${
                  entry.rank <= 3 ? 'border-primary shadow-lg' : ''
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    {/* Rank */}
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getRankColor(entry.rank)} flex items-center justify-center flex-shrink-0`}>
                      {getRankIcon(entry.rank) || (
                        <span className="text-2xl font-bold text-white">#{entry.rank}</span>
                      )}
                    </div>

                    {/* Student Info */}
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-1">{entry.student_name}</h3>
                      <p className="text-sm text-muted-foreground">{entry.email}</p>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-6">
                      <div className="text-center">
                        <div className="flex items-center gap-2 text-2xl font-bold text-primary mb-1">
                          <Target className="w-5 h-5" />
                          {entry.total_score}/10
                        </div>
                        <p className="text-xs text-muted-foreground">Score</p>
                      </div>

                      <div className="text-center">
                        <div className="flex items-center gap-2 text-2xl font-bold text-blue-600 mb-1">
                          <Timer className="w-5 h-5" />
                          {entry.total_time_minutes}m
                        </div>
                        <p className="text-xs text-muted-foreground">Time</p>
                      </div>

                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600 mb-1">
                          {entry.levels_passed}
                        </div>
                        <p className="text-xs text-muted-foreground">Levels</p>
                      </div>
                    </div>

                    {/* Top 3 Badge */}
                    {entry.rank <= 3 && (
                      <Badge 
                        className={`bg-gradient-to-r ${getRankColor(entry.rank)} text-white`}
                      >
                        Top {entry.rank}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
