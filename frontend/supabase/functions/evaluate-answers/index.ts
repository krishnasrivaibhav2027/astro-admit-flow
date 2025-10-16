import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questions } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const allScores: Array<{ scores: Record<string, number>, average: number }> = [];

    for (const q of questions) {
      const systemPrompt = `You are an expert physics examiner. Evaluate student answers based on these criteria (score 1-10 for each):
      - Relevance: How well does the answer address the question?
      - Clarity: Is the explanation clear and well-structured?
      - SubjectUnderstanding: Does it demonstrate deep understanding of physics concepts?
      - Accuracy: Are the facts and principles correct?
      - Completeness: Does it cover all necessary aspects?
      - CriticalThinking: Does it show analytical and reasoning skills?`;

      const userPrompt = `Question: ${q.question}

Correct/Model Answer: ${q.correctAnswer}

Student's Answer: ${q.studentAnswer}

Evaluate the student's answer and return ONLY a JSON object in this exact format:
{
  "Relevance": 7.5,
  "Clarity": 8.0,
  "SubjectUnderstanding": 7.0,
  "Accuracy": 8.5,
  "Completeness": 7.5,
  "CriticalThinking": 8.0
}

Be fair but rigorous in your evaluation. Scores should reflect actual performance.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to evaluate answer");
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to parse evaluation from AI response");
      }
      
      const scores = JSON.parse(jsonMatch[0]);
      
      // Calculate average
      const criteriaValues = Object.values(scores) as number[];
      const average = criteriaValues.reduce((sum, val) => sum + val, 0) / criteriaValues.length;
      
      allScores.push({
        scores,
        average
      });
    }

    // Calculate overall average
    const overallAverage = allScores.reduce((sum, item) => sum + item.average, 0) / allScores.length;

    // Prepare detailed scores for display
    const criteriaNames = ["Relevance", "Clarity", "Subject Understanding", "Accuracy", "Completeness", "Critical Thinking"];
    const detailedScores = criteriaNames.map(name => {
      const key = name.replace(/ /g, "");
      const avgScore = allScores.reduce((sum, item) => sum + (item.scores[key] || 0), 0) / allScores.length;
      return {
        name,
        score: avgScore
      };
    });

    return new Response(
      JSON.stringify({
        averageScore: overallAverage,
        scores: detailedScores,
        individualQuestionScores: allScores
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
