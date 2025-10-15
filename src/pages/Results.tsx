import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, XCircle, RotateCcw, Home, CheckCircle2, TrendingUp } from "lucide-react";

const Results = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { studentId, score, result, level, detailedScores } = location.state || {};

  useEffect(() => {
    if (!studentId || score === undefined) {
      navigate("/registration");
    }
  }, [studentId, score]);

  const isPassed = result === "pass";
  const scorePercentage = (score / 10) * 100;

  const criteria = detailedScores || [
    { name: "Relevance", score: score },
    { name: "Clarity", score: score },
    { name: "Subject Understanding", score: score },
    { name: "Accuracy", score: score },
    { name: "Completeness", score: score },
    { name: "Critical Thinking", score: score }
  ];

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-blue-600";
    if (score >= 4) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 8) return "bg-green-500";
    if (score >= 6) return "bg-blue-500";
    if (score >= 4) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-purple-50 to-blue-50 dark:from-background dark:via-purple-950/20 dark:to-blue-950/20" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
          {/* Result Header */}
          <Card className={`border-4 shadow-elevated ${isPassed ? 'border-green-500' : 'border-red-500'}`}>
            <CardContent className="p-12 text-center space-y-6">
              <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${
                isPassed ? 'bg-gradient-to-br from-green-500 to-emerald-500' : 'bg-gradient-to-br from-red-500 to-pink-500'
              } animate-scale-in glow-effect`}>
                {isPassed ? (
                  <Trophy className="w-12 h-12 text-white" />
                ) : (
                  <XCircle className="w-12 h-12 text-white" />
                )}
              </div>

              <div>
                <h1 className="text-4xl font-bold mb-2">
                  {isPassed ? (
                    <>Congratulations! <span className="gradient-text">You Passed!</span></>
                  ) : (
                    <>Test <span className="gradient-text">Not Passed</span></>
                  )}
                </h1>
                <p className="text-xl text-muted-foreground">
                  {level.charAt(0).toUpperCase() + level.slice(1)} Level Results
                </p>
              </div>

              <div className="inline-flex items-center gap-4 px-8 py-4 rounded-2xl bg-muted/50 border-2">
                <div className="text-left">
                  <p className="text-sm text-muted-foreground mb-1">Your Score</p>
                  <p className="text-5xl font-bold gradient-text">{score.toFixed(1)}</p>
                </div>
                <div className="text-6xl text-muted-foreground">/</div>
                <div className="text-left">
                  <p className="text-sm text-muted-foreground mb-1">Out of</p>
                  <p className="text-5xl font-bold">10.0</p>
                </div>
              </div>

              <Progress value={scorePercentage} className="h-3" />

              {isPassed ? (
                <Badge className="text-lg px-6 py-2 bg-green-500 hover:bg-green-600">
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Passed
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-lg px-6 py-2">
                  <XCircle className="w-5 h-5 mr-2" />
                  Not Passed
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Detailed Scores */}
          <Card className="border-2 shadow-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-primary" />
                Detailed Evaluation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {criteria.map((criterion: any, index: number) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{criterion.name}</span>
                    <span className={`text-lg font-bold ${getScoreColor(criterion.score)}`}>
                      {criterion.score.toFixed(1)} / 10
                    </span>
                  </div>
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`absolute inset-y-0 left-0 ${getScoreBg(criterion.score)} transition-all duration-1000`}
                      style={{ 
                        width: `${(criterion.score / 10) * 100}%`,
                        animationDelay: `${index * 0.1}s`
                      }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Feedback Message */}
          <Card className="border-2 bg-card/50 backdrop-blur">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-3">
                {isPassed ? "Great Job!" : "Keep Trying!"}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {isPassed ? (
                  level === "hard" ? (
                    "Exceptional work! You've successfully completed all levels of the admission test. Our team will review your application and contact you via email with the next steps."
                  ) : (
                    `Well done on passing the ${level} level! You can now proceed to the next challenge. Each level builds upon the previous one, testing your knowledge and skills progressively.`
                  )
                ) : (
                  `You need a minimum score of 5.0/10 to pass. Review the detailed feedback above to understand which areas need improvement. ${
                    level === "easy" ? "Unfortunately, the easy level only allows one attempt." : "You can retry this level if attempts are remaining."
                  }`
                )}
              </p>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            {isPassed && level !== "hard" ? (
              <Button
                size="lg"
                variant="glow"
                className="flex-1"
                onClick={() => navigate("/levels", { state: { studentId } })}
              >
                Continue to Next Level
                <Trophy className="w-5 h-5 ml-2" />
              </Button>
            ) : !isPassed && level !== "easy" ? (
              <Button
                size="lg"
                variant="glow"
                className="flex-1"
                onClick={() => navigate("/levels", { state: { studentId } })}
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Retry Level
              </Button>
            ) : null}
            
            <Button
              size="lg"
              variant="outline"
              className="flex-1"
              onClick={() => navigate("/")}
            >
              <Home className="w-5 h-5 mr-2" />
              Return Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;
