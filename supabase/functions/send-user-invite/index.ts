// supabase/functions/send-user-invite/index.ts
// Deno Edge Function for sending invite emails via Resend

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitePayload {
  name: string;
  email: string;
  staff_id: string;
  passcode: string;
}

serve(async (req: Request): Promise<Response> => {
  // --- CORS preflight ---
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method Not Allowed" }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }

  try {
    const payload = (await req.json().catch(() => ({}))) as Partial<InvitePayload>;
    const { name, email, staff_id, passcode } = payload;

    // --- Basic validation ---
    if (!email || !name || !staff_id || !passcode) {
      console.error("Missing fields in payload:", payload);
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not set");
      return new Response(
        JSON.stringify({ error: "Resend API key not configured" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const subject = "Your DesignCell Taskboard Login";
    const html = `
      <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #111827;">
        <h2 style="margin-bottom: 8px;">Welcome to DesignCell Taskboard</h2>
        <p>Hi ${name},</p>
        <p>You have been added to the DesignCell Taskboard.</p>
        <p>Your login details are:</p>
        <ul>
          <li><strong>User ID:</strong> ${staff_id}</li>
          <li><strong>PIN:</strong> ${passcode}</li>
        </ul>
        <p>Please keep this information safe.</p>
        <p style="margin-top: 16px;">Best regards,<br/>DesignCell Team</p>
      </div>
    `;

    // --- Call Resend API ---
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // ✅ DEFAULT RESEND SENDER (works without domain verification)
        from: "DesignCell Taskboard <taskbooard@designcell.com.np>",
        to: [email],
        subject,
        html,
      }),
    });

    const resendJson = await resendRes.json().catch(() => null);

    if (!resendRes.ok) {
      console.error("Resend error:", resendRes.status, resendJson);
      return new Response(
        JSON.stringify({
          error: "Failed to send email",
          status: resendRes.status,
          details: resendJson,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    console.log("Resend success:", resendJson);

    return new Response(
      JSON.stringify({ success: true, details: resendJson }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (err) {
    console.error("send-user-invite fatal error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});