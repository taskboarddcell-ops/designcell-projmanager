import { createClient } from '@supabase/supabase-js';
import { Task, TaskStatusLog, Profile, Project, ReportRequest } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Fetch all data needed for report generation
 */
export async function fetchReportData(request: ReportRequest) {
    const { reportType, startDate, endDate, projectIds, staffId } = request;

    // Build task query based on report type
    let tasksQuery = supabase
        .from('tasks')
        .select('*');

    // Filter by report type
    if (reportType === 'individual' && staffId) {
        tasksQuery = tasksQuery.contains('assignee_ids', [staffId]);
    } else if (reportType === 'project' && projectIds && projectIds.length > 0) {
        tasksQuery = tasksQuery.in('project_id', projectIds);
    }
    // For 'firm' report, fetch all tasks (no additional filter)

    const { data: tasks, error: tasksError } = await tasksQuery;
    if (tasksError) throw new Error(`Failed to fetch tasks: ${tasksError.message}`);

    // Fetch task IDs for status logs
    const taskIds = (tasks || []).map(t => t.id);

    // Fetch status logs for these tasks
    let logs: TaskStatusLog[] = [];
    if (taskIds.length > 0) {
        // Batch in chunks of 1000 to avoid URL length limits
        const chunks = chunkArray(taskIds, 1000);
        const logPromises = chunks.map(chunk =>
            supabase
                .from('task_status_log')
                .select('*')
                .in('task_id', chunk)
                .order('changed_at', { ascending: true })
        );

        const logResults = await Promise.all(logPromises);
        logs = logResults.flatMap(r => r.data || []);
    }

    // Fetch all users (staff members)
    const { data: profiles } = await supabase
        .from('users')
        .select('staff_id, name')
        .eq('status', 'active');

    // Fetch projects
    let projectsQuery = supabase.from('projects').select('*');
    if (projectIds && projectIds.length > 0) {
        projectsQuery = projectsQuery.in('id', projectIds);
    }
    const { data: projects } = await projectsQuery;

    return {
        tasks: (tasks || []) as Task[],
        logs: logs as TaskStatusLog[],
        profiles: (profiles || []) as Profile[],
        projects: (projects || []) as Project[]
    };
}

/**
 * Fetch data for prior period comparison
 */
export async function fetchPriorPeriodData(request: ReportRequest) {
    const start = new Date(request.startDate);
    const end = new Date(request.endDate);
    const rangeDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 3600 * 24));

    // Calculate prior period dates
    const priorEnd = new Date(start);
    priorEnd.setDate(priorEnd.getDate() - 1);
    const priorStart = new Date(priorEnd);
    priorStart.setDate(priorStart.getDate() - rangeDays);

    const priorRequest: ReportRequest = {
        ...request,
        startDate: priorStart.toISOString().split('T')[0],
        endDate: priorEnd.toISOString().split('T')[0]
    };

    return fetchReportData(priorRequest);
}

/**
 * Helper to chunk arrays
 */
function chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

/**
 * Get max timestamps for data fingerprinting
 */
export async function getDataTimestamps(request: ReportRequest) {
    const { projectIds, staffId } = request;

    let tasksQuery = supabase
        .from('tasks')
        .select('created_at, completed_at');

    if (staffId) {
        tasksQuery = tasksQuery.contains('assignee_ids', [staffId]);
    } else if (projectIds && projectIds.length > 0) {
        tasksQuery = tasksQuery.in('project_id', projectIds);
    }

    const { data: tasks } = await tasksQuery;

    const { data: logs } = await supabase
        .from('task_status_log')
        .select('changed_at')
        .order('changed_at', { ascending: false })
        .limit(1);

    return {
        taskCount: tasks?.length || 0,
        maxCreated: tasks?.reduce((max, t) => t.created_at > max ? t.created_at : max, '') || '',
        maxCompleted: tasks?.reduce((max, t) => (t.completed_at && t.completed_at > max) ? t.completed_at : max, '') || '',
        maxLogChange: logs?.[0]?.changed_at || ''
    };
}
