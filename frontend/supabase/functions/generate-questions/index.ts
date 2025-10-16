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
    const { level, numQuestions } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert physics exam question generator. You MUST return valid JSON only. Generate challenging, thought-provoking questions appropriate for the ${level} difficulty level.`;
    
    const userPrompt = `Generate ${numQuestions} UNIQUE physics questions at ${level} difficulty level. 

CRITICAL: Return ONLY valid JSON. Ensure all strings are properly escaped.

Requirements:
- Questions should cover different physics topics (mechanics, thermodynamics, electromagnetism, optics, modern physics)
- Each question should require a detailed explanation, not just a number
- Provide comprehensive model answers that demonstrate deep understanding
- ${level === 'easy' ? 'Focus on fundamental concepts and basic applications' : ''}
- ${level === 'medium' ? 'Include problem-solving and application of concepts' : ''}
- ${level === 'hard' ? 'Require advanced reasoning, multiple concepts integration, and critical thinking' : ''}

Return ONLY a valid JSON array with properly escaped strings:
[
  {
    "question": "question text",
    "answer": "answer text"
  }
]

Do not include markdown, code blocks, or any text outside the JSON array.`;

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
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate questions");
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    
    console.log("Raw AI response:", content.substring(0, 200));
    
    // Remove markdown code blocks if present
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Extract JSON array from the response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("No JSON array found in response");
      throw new Error("Failed to parse questions from AI response");
    }
    
    let questions;
    try {
      questions = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Attempted to parse:", jsonMatch[0].substring(0, 500));
      throw new Error("Invalid JSON format in AI response");
    }
    
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("AI did not return a valid array of questions");
    }

    return new Response(
      JSON.stringify({ questions }),
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
