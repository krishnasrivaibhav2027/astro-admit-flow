import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Restrict this in production
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const requestSchema = z.object({
  studentEmail: z.string().email(),
  studentName: z.string().min(1),
  result: z.enum(["pass", "fail"]),
  score: z.number(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentEmail, studentName, result, score } = requestSchema.parse(await req.json());

    const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_FROM_EMAIL } = Deno.env.toObject();
    if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN || !GMAIL_FROM_EMAIL) {
      throw new Error("Missing required Gmail environment variables.");
    }

    // Exchange refresh token for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: GMAIL_CLIENT_ID,
        client_secret: GMAIL_CLIENT_SECRET,
        refresh_token: GMAIL_REFRESH_TOKEN,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("Failed to refresh access token.");
    }
    const { access_token: accessToken } = await tokenResponse.json();

    const subject = `Your Admission Test Results: You ${result === "pass" ? "Passed" : "Failed"}`;
    const emailBody = `
Dear ${studentName},

Thank you for completing your admission test. Here are your results:

- **Final Score**: ${score.toFixed(1)} / 10
- **Outcome**: ${result.toUpperCase()}

${result === "pass"
  ? "Congratulations on passing! We will review your results and be in touch regarding the next steps."
  : "We encourage you to review the material and consider retaking the test if attempts are available."
}

Best regards,
The Admission Team
    `.trim();

    const emailMessage = [
      `From: "Admission Team" <${GMAIL_FROM_EMAIL}>`,
      `To: ${studentEmail}`,
      `Subject: ${subject}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      emailBody,
    ].join("\n");

    const encodedMessage = btoa(emailMessage).replace(/\+/g, '-').replace(/\//g, '_');

    const sendResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: encodedMessage }),
    });

    if (!sendResponse.ok) {
      throw new Error(`Failed to send email: ${await sendResponse.text()}`);
    }

    const sendData = await sendResponse.json();
    return new Response(JSON.stringify({ success: true, messageId: sendData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error:", error);
    const status = error instanceof z.ZodError ? 400 : 500;
    return new Response(JSON.stringify({ error: error.message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
