import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Award, Target, Zap, Crown, BarChart2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Define the structure of the evaluation and result data
interface Evaluation {
  question_number: number;
  question: string;
  student_answer: string;
  scores: Record<string, number>;
  average: number;
}

interface ResultData {
  result_id: string;
  score: number;
  result: "pass" | "fail";
  criteria: Record<string, number>;
  evaluations: Evaluation[];
}

const Results = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { studentId, resultId } = location.state || {};

  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    if (!resultId) {
      setError("Result ID is missing. Cannot fetch results.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("results")
        .select("*, students(first_name)")
        .eq("id", resultId)
        .single();

      if (fetchError || !data) {
        throw fetchError || new Error("Result not found.");
      }

      // Here, you would typically get the detailed evaluation data.
      // Assuming it's stored or fetched from another source if not in the 'results' table.
      // For this example, we'll simulate a fetch or use placeholders.
      const evaluationData = data.evaluation_details || {
        criteria: { Relevance: 0, Clarity: 0, SubjectUnderstanding: 0, Accuracy: 0, Completeness: 0, CriticalThinking: 0 },
        evaluations: []
      };

      setResultData({
        result_id: data.id,
        score: data.score,
        result: data.result,
        ...evaluationData,
      });

    } catch (err: any) {
      setError(err.message || "An unknown error occurred.");
      toast({
        title: "Error fetching results",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [resultId, toast]);

  useEffect(() => {
    if (!studentId) {
      navigate("/login");
    } else {
      fetchResults();
    }
  }, [studentId, navigate, fetchResults]);

  if (loading) {
    return <ResultsSkeleton />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!resultData) {
    return <ErrorState message="No result data is available." />;
  }
  
  const { result, score, criteria, evaluations } = resultData;
  const isPass = result === "pass";
  const levelIcon = resultData.level === 'easy' ? Target : resultData.level === 'medium' ? Zap : Crown;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8">
      <main className="max-w-4xl mx-auto">
        <Card className="mb-8">
          <CardHeader className="text-center">
            {isPass ? (
              <Award className="w-16 h-16 mx-auto text-green-500" />
            ) : (
              <XCircle className="w-16 h-16 mx-auto text-red-500" />
            )}
            <CardTitle className={`text-4xl font-bold ${isPass ? 'text-green-600' : 'text-red-600'}`}>
              Test {isPass ? "Passed" : "Failed"}
            </CardTitle>
            <p className="text-xl text-muted-foreground">
              Your final score is <strong>{score.toFixed(1)}/10</strong>
            </p>
          </CardHeader>
          <CardContent className="flex justify-center gap-4">
            <Button asChild>
              <Link to="/levels">Back to Levels</Link>
            </Button>
            {!isPass && (
              <Button variant="outline">
                Retry Level
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Other sections like criteria breakdown can be added here */}

      </main>
    </div>
  );
};

const ResultsSkeleton = () => (
  <div className="max-w-4xl mx-auto p-4 sm:p-8">
    <Card className="mb-8">
      <CardHeader className="text-center space-y-4">
        <Skeleton className="w-16 h-16 rounded-full mx-auto" />
        <Skeleton className="h-10 w-3/4 mx-auto" />
        <Skeleton className="h-6 w-1/2 mx-auto" />
      </CardHeader>
      <CardContent className="flex justify-center gap-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </CardContent>
    </Card>
    {/* Add more skeleton loaders for other sections */}
  </div>
);

const ErrorState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center min-h-screen text-center">
    <Alert variant="destructive" className="max-w-lg">
      <AlertTitle>An Error Occurred</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
    <Button asChild className="mt-4">
      <Link to="/levels">Go Back</Link>
    </Button>
  </div>
);

export default Results;
