// supabase/functions/send-task-assignment-email/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TaskEmailPayload {
  email: string;
  name: string;
  taskTitle: string;
  projectName: string;
  dueDate: string;
  taskId: string;
  appUrl?: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method Not Allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const payload = (await req.json().catch(() => ({}))) as Partial<
      TaskEmailPayload
    >;
    const { email, name, taskTitle, projectName, dueDate, taskId, appUrl } =
      payload;

    if (!email || !name || !taskTitle || !projectName) {
      console.error("Missing required fields:", payload);
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not set");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const subject = `New task assigned: ${taskTitle}`;
    const taskLink = taskId ? `${appUrl || ""}/tasks/${taskId}` : "";

    const html = `
      <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #111827; max-width: 600px; margin: 0 auto;">
        <h2 style="margin-bottom: 8px;">New Task Assigned</h2>
        <p>Hi ${name},</p>
        <p>You have been assigned a new task.</p>
        
        <div style="background: #f3f4f6; padding: 16px; border-radius: 6px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Task:</strong> ${taskTitle}</p>
          <p style="margin: 0 0 8px 0;"><strong>Project:</strong> ${projectName}</p>
          <p style="margin: 0;"><strong>Due Date:</strong> ${dueDate}</p>
        </div>
        
        ${
          taskLink
            ? `<p><a href="${taskLink}" style="background: #172554; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">View Task</a></p>`
            : ""
        }
        
        <p style="margin-top: 24px; font-size: 12px; color: #6b7280;">Best regards,<br/>DesignCell Project Manager</p>
      </div>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "noreply@designcell.com",
        to: email,
        subject: subject,
        html: html,
      }),
    });

    if (!resendRes.ok) {
      const error = await resendRes.text();
      console.error("Resend API error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result = await resendRes.json();
    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-task-assignment-email error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
