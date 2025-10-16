import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  studentEmail: string;
  studentName: string;
  level: string;
  result: string;
  score: number;
  attempts: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentEmail, studentName, level, result, score, attempts }: EmailRequest = await req.json();

    // Get Gmail credentials from environment
    const GMAIL_CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID");
    const GMAIL_CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET");
    const GMAIL_REFRESH_TOKEN = Deno.env.get("GMAIL_REFRESH_TOKEN");

    if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
      throw new Error("Gmail credentials are not configured");
    }

    // Get access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: GMAIL_CLIENT_ID,
        client_secret: GMAIL_CLIENT_SECRET,
        refresh_token: GMAIL_REFRESH_TOKEN,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("Failed to get access token");
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Prepare email content
    const subject = result === "pass" 
      ? `Congratulations! You passed the ${level} level`
      : `Test Results - ${level.charAt(0).toUpperCase() + level.slice(1)} Level`;

    const emailBody = result === "pass" 
      ? `Dear ${studentName},

Congratulations! You have successfully passed the ${level} level of the admission test.

Test Details:
- Level: ${level.charAt(0).toUpperCase() + level.slice(1)}
- Score: ${score.toFixed(1)}/10.0
- Result: PASSED
- Attempt: ${attempts}

${level === "hard" 
  ? "Excellent work! You have completed all levels of the admission test. Our team will review your application and contact you with the next steps."
  : "You can now proceed to the next level. Keep up the great work!"
}

Best regards,
Admission Team`
      : `Dear ${studentName},

We have received your test results for the ${level} level of the admission test.

Test Details:
- Level: ${level.charAt(0).toUpperCase() + level.slice(1)}
- Score: ${score.toFixed(1)}/10.0
- Result: NOT PASSED
- Attempts Used: ${attempts}/${level === "easy" ? "1" : "2"}

Unfortunately, you did not achieve the minimum required score of 5.0/10 to pass this level. 
${attempts >= (level === "easy" ? 1 : 2) 
  ? "You have used all available attempts for this level." 
  : "You may retry this level if you wish to improve your score."
}

We encourage you to review the material and consider retaking the test if attempts are available.

Best regards,
Admission Team`;

    // Create email message
    const emailMessage = [
      `To: ${studentEmail}`,
      `Subject: ${subject}`,
      `Content-Type: text/plain; charset=utf-8`,
      "",
      emailBody
    ].join("\n");

    // Encode email in base64
    const encodedMessage = btoa(emailMessage).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // Send email via Gmail API
    const sendResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: encodedMessage
      }),
    });

    if (!sendResponse.ok) {
      const errorData = await sendResponse.text();
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const sendData = await sendResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        messageId: sendData.id,
        message: "Email sent successfully"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || "Failed to send email" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});