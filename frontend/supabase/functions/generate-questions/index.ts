import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.4/mod.ts";

// It's recommended to restrict the origin in production
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Define a schema for input validation
const requestSchema = z.object({
  level: z.enum(["easy", "medium", "hard"]),
  num_questions: z.number().int().min(1).max(10),
});

// Define a schema for the expected AI response structure
const questionSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});
const aiResponseSchema = z.array(questionSchema);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate the input payload
    const payload = await req.json();
    const { level, num_questions } = requestSchema.parse(payload);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured.");
    }

    const systemPrompt = `You are an expert physics exam question generator. Generate ${num_questions} UNIQUE physics questions at ${level} difficulty. Return ONLY a valid JSON array.`;

    const userPrompt = `
      Generate ${num_questions} UNIQUE physics questions at ${level} difficulty.
      Requirements:
      - Each question should require a detailed explanation.
      - Provide comprehensive model answers.
      - Return ONLY a valid JSON array in this format: [{"question": "...", "answer": "..."}]
    `;

    // Add a timeout and robust error handling to the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-1.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.5,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Invalid response structure from AI.");
    }

    // Strengthen JSON extraction and parsing
    let questions;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON array found in the AI response.");
      }
      questions = JSON.parse(jsonMatch[0]);
    } catch (e) {
      throw new Error(`Failed to parse JSON from AI response: ${e.message}`);
    }
    
    // Validate the structure of the parsed questions
    const validatedQuestions = aiResponseSchema.parse(questions);

    return new Response(
      JSON.stringify({ questions: validatedQuestions }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error:", error);
    // Differentiate between client and server errors
    const isValidationError = error instanceof z.ZodError;
    return new Response(
      JSON.stringify({ error: isValidationError ? "Invalid input" : error.message || "Internal server error" }),
      {
        status: isValidationError ? 400 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
