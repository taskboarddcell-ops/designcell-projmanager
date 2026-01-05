// supabase/functions/send-daily-digest/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    // Get date 7 days from now
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split("T")[0];

    // Get all users
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("*");

    if (usersError || !users) {
      throw new Error(`Failed to fetch users: ${usersError?.message}`);
    }

    let sentCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        // Get tasks for this user, filtering out projects on hold
        const { data: tasks, error: tasksError } = await supabase
          .from("tasks")
          .select("*, projects!inner(project_status)")
          .contains("assignee_ids", [user.staff_id])
          .neq("status", "Complete")
          .neq("status", "Completed")
          .neq("projects.project_status", "On Hold")
          .not("due", "is", null);

        if (tasksError) {
          console.error(
            `Failed to fetch tasks for ${user.staff_id}:`,
            tasksError
          );
          continue;
        }

        // Group tasks by due date
        const overdue: typeof tasks = [];
        const dueToday: typeof tasks = [];
        const dueNextWeek: typeof tasks = [];

        for (const task of tasks || []) {
          const dueDate = task.due;
          if (dueDate < todayStr) {
            overdue.push(task);
          } else if (dueDate === todayStr) {
            dueToday.push(task);
          } else if (dueDate <= nextWeekStr) {
            dueNextWeek.push(task);
          }
        }

        // Skip if no tasks
        if (overdue.length === 0 && dueToday.length === 0 && dueNextWeek.length === 0) {
          continue;
        }

        // Format tasks for email
        const formatTasks = (taskList: typeof tasks) => {
          return taskList
            .map((t) => {
              const due = new Date(t.due).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
              return `  • [${due}] ${t.task} (${t.project_name || "Unknown"})`;
            })
            .join("\n");
        };

        // Build email body
        let emailBody = `Hi ${user.name},\n\nHere's your task summary for today:\n\n`;

        if (overdue.length > 0) {
          emailBody += `⚠ OVERDUE TASKS (${overdue.length}):\n${formatTasks(overdue)}\n\n`;
        }

        if (dueToday.length > 0) {
          emailBody += `✅ DUE TODAY (${dueToday.length}):\n${formatTasks(dueToday)}\n\n`;
        }

        if (dueNextWeek.length > 0) {
          emailBody += `📅 DUE IN THE NEXT 7 DAYS (${dueNextWeek.length}):\n${formatTasks(dueNextWeek)}\n\n`;
        }

        emailBody += `\nVisit the app to manage your tasks.\n\nBest regards,\nDesignCell Project Manager`;

        // Send email via Resend
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "noreply@designcell.com",
            to: user.email,
            subject: `Your daily task summary — ${overdue.length + dueToday.length + dueNextWeek.length} items`,
            text: emailBody,
          }),
        });

        if (emailRes.ok) {
          sentCount++;

          // Create notification entry
          const total =
            overdue.length + dueToday.length + dueNextWeek.length;
          await supabase.from("notifications").insert([
            {
              user_id: user.staff_id,
              type: "DAILY_DIGEST",
              title: `Daily task summary — ${total} items`,
              body: `${overdue.length} overdue, ${dueToday.length} due today, ${dueNextWeek.length} due this week`,
              link_url: "/tasks",
            },
          ]);
        } else {
          errorCount++;
          console.error(`Failed to send email to ${user.email}`);
        }
      } catch (err) {
        errorCount++;
        console.error(`Error processing user ${user.staff_id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        errors: errorCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("send-daily-digest error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
