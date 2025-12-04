// lib/notificationHelpers.js
import { supabase } from './supabaseClient';

/**
 * Create notification for task assignment
 * Called when a task is assigned or reassigned
 */
export async function createTaskAssignmentNotification(task, oldAssigneeIds = []) {
  if (!task || !task.assignee_ids || task.assignee_ids.length === 0) {
    return;
  }

  // Skip if task is already completed
  if (task.status === 'Complete' || task.status === 'Completed') {
    return;
  }

  // Find newly assigned users (not in old list)
  const newAssignees = task.assignee_ids.filter(
    (id) => !oldAssigneeIds.includes(id)
  );

  if (newAssignees.length === 0) {
    return;
  }

  // Get project name if not already in task
  let projectName = task.project_name;
  if (!projectName && task.project_id) {
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', task.project_id)
      .single();
    projectName = project?.name || 'Unknown Project';
  }

  // Format due date
  const dueStr = task.due 
    ? new Date(task.due).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'No due date';

  // Create notification for each newly assigned user
  const notifications = newAssignees.map((staffId) => ({
    user_id: staffId,
    type: 'TASK_ASSIGNED',
    title: `New task assigned: ${task.task || 'Untitled'}`,
    body: `You have been assigned a new task in project "${projectName}".\n\nDue date: ${dueStr}`,
    link_url: `/tasks/${task.id}`,
  }));

  const { error } = await supabase
    .from('notifications')
    .insert(notifications);

  if (error) {
    console.error('Create task assignment notification error:', error);
  }

  return notifications;
}

/**
 * Send task assignment email via edge function
 */
export async function sendTaskAssignmentEmail(task, assigneeIds) {
  if (!assigneeIds || assigneeIds.length === 0) {
    return;
  }

  // Get assignee details
  const { data: assignees } = await supabase
    .from('users')
    .select('email, name')
    .in('staff_id', assigneeIds);

  if (!assignees || assignees.length === 0) {
    return;
  }

  // Get project details
  let projectName = task.project_name;
  if (!projectName && task.project_id) {
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', task.project_id)
      .single();
    projectName = project?.name || 'Unknown Project';
  }

  const dueStr = task.due
    ? new Date(task.due).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'No due date';

  // Send email for each assignee
  for (const assignee of assignees) {
    try {
      // You can implement this with your email service (Resend, SendGrid, etc.)
      // For now, we'll log it
      console.log(`Sending task assignment email to ${assignee.email}`);
      
      // Example: call an edge function
      // await supabase.functions.invoke('send-task-assignment-email', {
      //   body: {
      //     email: assignee.email,
      //     name: assignee.name,
      //     taskTitle: task.task,
      //     projectName,
      //     dueDate: dueStr,
      //     taskId: task.id,
      //   },
      // });
    } catch (error) {
      console.error(`Failed to send email to ${assignee.email}:`, error);
    }
  }
}

/**
 * Get tasks for daily digest
 */
export async function getTasksForDailyDigest(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .contains('assignee_ids', [userId])
    .neq('status', 'Complete')
    .neq('status', 'Completed')
    .not('due', 'is', null)
    .gte('due', todayStr);

  if (error) {
    console.error('Get digest tasks error:', error);
    return { overdue: [], today: [], nextWeek: [] };
  }

  // Group tasks
  const overdue = [];
  const todayTasks = [];
  const nextWeekTasks = [];

  (tasks || []).forEach((task) => {
    const dueDate = task.due;
    if (dueDate < todayStr) {
      overdue.push(task);
    } else if (dueDate === todayStr) {
      todayTasks.push(task);
    } else if (dueDate <= nextWeekStr) {
      nextWeekTasks.push(task);
    }
  });

  return {
    overdue: overdue.sort((a, b) => new Date(a.due) - new Date(b.due)),
    today: todayTasks,
    nextWeek: nextWeekTasks.sort((a, b) => new Date(a.due) - new Date(b.due)),
  };
}

/**
 * Format task list for email
 */
export function formatTasksForEmail(tasks) {
  return tasks
    .map((t) => {
      const due = new Date(t.due).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      return `  • [${due}] ${t.task} (Project: ${t.project_name || 'Unknown'})`;
    })
    .join('\n');
}

/**
 * Send daily digest email
 */
export async function sendDailyDigestEmail(user, digest) {
  const hasOverdue = digest.overdue.length > 0;
  const hasToday = digest.today.length > 0;
  const hasNextWeek = digest.nextWeek.length > 0;

  // Skip if no tasks
  if (!hasOverdue && !hasToday && !hasNextWeek) {
    return;
  }

  try {
    // Format email body
    let body = `Hi ${user.name},\n\n`;
    body += `Here's your task summary for today:\n\n`;

    if (hasOverdue) {
      body += `⚠ OVERDUE TASKS (${digest.overdue.length}):\n`;
      body += formatTasksForEmail(digest.overdue) + '\n\n';
    }

    if (hasToday) {
      body += `✅ DUE TODAY (${digest.today.length}):\n`;
      body += formatTasksForEmail(digest.today) + '\n\n';
    }

    if (hasNextWeek) {
      body += `📅 DUE IN THE NEXT 7 DAYS (${digest.nextWeek.length}):\n`;
      body += formatTasksForEmail(digest.nextWeek) + '\n\n';
    }

    body += `\nVisit the app to manage your tasks.\n\nBest regards,\nDesignCell Project Manager`;

    console.log(`Sending daily digest email to ${user.email}`);
    
    // Implement with your email service
    // await supabase.functions.invoke('send-email', {
    //   body: {
    //     to: user.email,
    //     subject: `Your daily task summary — ${hasOverdue + hasToday + hasNextWeek} items`,
    //     text: body,
    //   },
    // });
  } catch (error) {
    console.error(`Failed to send digest to ${user.email}:`, error);
  }
}

/**
 * Create daily digest notification entry
 */
export async function createDailyDigestNotification(user, digest) {
  const total = digest.overdue.length + digest.today.length + digest.nextWeek.length;

  if (total === 0) {
    return;
  }

  const { error } = await supabase
    .from('notifications')
    .insert([
      {
        user_id: user.staff_id,
        type: 'DAILY_DIGEST',
        title: `Daily task summary — ${total} items`,
        body: `${digest.overdue.length} overdue, ${digest.today.length} due today, ${digest.nextWeek.length} due this week`,
        link_url: '/tasks',
      },
    ]);

  if (error) {
    console.error('Create digest notification error:', error);
  }
}
