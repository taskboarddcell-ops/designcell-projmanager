// @ts-nocheck
/**
 * Task Assignment Handlers
 * Phase 3: Extracted from ProjectManagerClient.tsx
 * 
 * This module handles all task assignment operations including:
 * - Single task creation/update
 * - Bulk task assignment
 * - Task status updates
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
    Task,
    Project,
    User,
    AssignState,
    StagePlan,
    esc,
    isValidSubId,
    validateProjectContext,
    isAdmin,
    isProjectLead,
    assignLogger as logger,
} from './types';

// ============ INTERFACES ============

export interface TaskCreateParams {
    projectId: string;
    projectName: string;
    stageId: string;
    subId: string;
    taskTitle: string;
    description?: string;
    dueDate: string;
    priority: 'High' | 'Medium' | 'Low';
    assigneeIds: string[];
    assigneeNames: string[];
    createdById: string;
    createdByName: string;
}

export interface TaskUpdateParams {
    taskId: string;
    assigneeIds?: string[];
    assigneeNames?: string[];
    dueDate?: string;
    priority?: string;
    status?: string;
}

export interface BulkAssignParams {
    project: Project;
    stageName: string;
    dueDate: string;
    priority: string;
    assigneeIds: string[];
    assigneeNames: string[];
    currentUser: User;
    existingTasks: Task[];
}

export interface BulkAssignResult {
    success: boolean;
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
    error?: string;
    tasks: Task[];
}

// ============ TASK CREATION ============

/**
 * Create a single task
 */
export async function createTask(
    supabase: SupabaseClient,
    params: TaskCreateParams
): Promise<{ success: boolean; task?: Task; error?: string }> {
    // Validate sub_id
    if (!isValidSubId(params.subId)) {
        logger.error('Invalid sub_id for task creation', { subId: params.subId });
        return { success: false, error: 'Invalid sub-stage specified' };
    }

    logger.info('Creating task', {
        project: params.projectName,
        stage: params.stageId,
        sub: params.subId,
    });

    try {
        const { data, error } = await supabase
            .from('tasks')
            .insert({
                project_id: params.projectId,
                project_name: params.projectName,
                stage_id: params.stageId,
                sub_id: params.subId,
                task: params.taskTitle,
                description: params.description || '',
                due: params.dueDate,
                priority: params.priority,
                status: 'Pending',
                assignee_ids: params.assigneeIds,
                assignees: params.assigneeNames,
                created_by_id: params.createdById,
                created_by_name: params.createdByName,
            })
            .select()
            .single();

        if (error) {
            logger.error('Task creation failed', error);
            return { success: false, error: error.message };
        }

        logger.info('Task created successfully', { taskId: data.id });
        return { success: true, task: data };
    } catch (err: any) {
        logger.error('Task creation exception', err);
        return { success: false, error: err.message || 'Unknown error' };
    }
}

/**
 * Update an existing task
 */
export async function updateTask(
    supabase: SupabaseClient,
    params: TaskUpdateParams
): Promise<{ success: boolean; error?: string }> {
    logger.info('Updating task', { taskId: params.taskId });

    const updateData: any = {};
    if (params.assigneeIds !== undefined) updateData.assignee_ids = params.assigneeIds;
    if (params.assigneeNames !== undefined) updateData.assignees = params.assigneeNames;
    if (params.dueDate !== undefined) updateData.due = params.dueDate;
    if (params.priority !== undefined) updateData.priority = params.priority;
    if (params.status !== undefined) updateData.status = params.status;

    try {
        const { error } = await supabase
            .from('tasks')
            .update(updateData)
            .eq('id', params.taskId);

        if (error) {
            logger.error('Task update failed', error);
            return { success: false, error: error.message };
        }

        logger.info('Task updated successfully');
        return { success: true };
    } catch (err: any) {
        logger.error('Task update exception', err);
        return { success: false, error: err.message || 'Unknown error' };
    }
}

// ============ BULK ASSIGNMENT ============

/**
 * Perform bulk assignment for all sub-stages in a stage
 * This correctly iterates through each sub-stage instead of using "(All Sub-stages)"
 */
export async function bulkAssignTasks(
    supabase: SupabaseClient,
    params: BulkAssignParams
): Promise<BulkAssignResult> {
    const { project, stageName, dueDate, priority, assigneeIds, assigneeNames, currentUser, existingTasks } = params;

    logger.info('Starting bulk assignment', {
        project: project.name,
        stage: stageName,
        assigneeCount: assigneeIds.length,
    });

    // Find the stage in the project plan
    const plan = Array.isArray(project.stage_plan) ? project.stage_plan : [];
    const stageObj = plan.find((s: StagePlan) => (s.stage || s.name) === stageName);

    if (!stageObj) {
        logger.error('Stage not found in plan', { stageName });
        return {
            success: false,
            createdCount: 0,
            updatedCount: 0,
            skippedCount: 0,
            error: 'Stage not found in project plan',
            tasks: [],
        };
    }

    const subs = stageObj.subs || stageObj.sub_stages || [];
    if (!subs.length) {
        logger.warn('No sub-stages to assign', { stageName });
        return {
            success: false,
            createdCount: 0,
            updatedCount: 0,
            skippedCount: 0,
            error: 'No sub-stages defined for this stage',
            tasks: [],
        };
    }

    logger.info(`Processing ${subs.length} sub-stages`);

    const newTasks: Task[] = [];
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const sub of subs) {
        // Skip invalid sub-stage names
        if (!isValidSubId(sub)) {
            logger.warn('Skipping invalid sub-stage', { sub });
            skippedCount++;
            continue;
        }

        // Check for existing task
        const existing = existingTasks.find(
            (t) =>
                t.project_id === project.id &&
                (t.stage_id || '') === stageName &&
                (t.sub_id || '') === sub
        );

        if (existing) {
            // Update existing task
            const { data, error } = await supabase
                .from('tasks')
                .update({
                    assignee_ids: assigneeIds,
                    assignees: assigneeNames,
                    due: dueDate,
                    priority: priority,
                })
                .eq('id', existing.id)
                .select()
                .single();

            if (!error && data) {
                newTasks.push(data);
                updatedCount++;
            } else {
                logger.error('Failed to update task during bulk assign', { taskId: existing.id, error });
            }
        } else {
            // Create new task
            const taskTitle = `${stageName} - ${sub}`;
            const { data, error } = await supabase
                .from('tasks')
                .insert({
                    project_id: project.id,
                    project_name: project.name,
                    stage_id: stageName,
                    sub_id: sub, // Correct sub_id, never "(All Sub-stages)"
                    assignee_ids: assigneeIds,
                    assignees: assigneeNames,
                    status: 'Pending',
                    task: taskTitle,
                    due: dueDate,
                    priority: priority,
                    description: '',
                    created_by_id: currentUser.staff_id,
                    created_by_name: currentUser.name,
                })
                .select()
                .single();

            if (!error && data) {
                newTasks.push(data);
                createdCount++;
            } else {
                logger.error('Failed to create task during bulk assign', { sub, error });
            }
        }
    }

    logger.info('Bulk assignment complete', { createdCount, updatedCount, skippedCount });

    return {
        success: true,
        createdCount,
        updatedCount,
        skippedCount,
        tasks: newTasks,
    };
}

// ============ TASK STATUS UPDATES ============

/**
 * Update task status with optional completion details
 */
export async function updateTaskStatus(
    supabase: SupabaseClient,
    taskId: string,
    newStatus: string,
    remarks?: string,
    completedBy?: string
): Promise<{ success: boolean; error?: string }> {
    logger.info('Updating task status', { taskId, newStatus });

    const updateData: any = { status: newStatus };

    if (newStatus === 'Complete') {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = completedBy;
        if (remarks) updateData.completion_remarks = remarks;
    } else if (newStatus === 'Pending' && remarks) {
        updateData.reschedule_remarks = remarks;
    }

    try {
        const { error } = await supabase
            .from('tasks')
            .update(updateData)
            .eq('id', taskId);

        if (error) {
            logger.error('Task status update failed', error);
            return { success: false, error: error.message };
        }

        logger.info('Task status updated successfully');
        return { success: true };
    } catch (err: any) {
        logger.error('Task status update exception', err);
        return { success: false, error: err.message || 'Unknown error' };
    }
}

// ============ TASK DELETION ============

/**
 * Delete a task (Admin only)
 */
export async function deleteTask(
    supabase: SupabaseClient,
    taskId: string
): Promise<{ success: boolean; error?: string }> {
    logger.info('Deleting task', { taskId });

    try {
        // First delete related task status logs
        const { error: logError } = await supabase
            .from('task_status_log')
            .delete()
            .eq('task_id', taskId);

        if (logError) {
            logger.warn('Failed to delete task logs', logError);
            // Continue anyway - logs are not critical
        }

        // Delete the task itself
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId);

        if (error) {
            logger.error('Task deletion failed', error);
            return { success: false, error: error.message };
        }

        logger.info('Task deleted successfully');
        return { success: true };
    } catch (err: any) {
        logger.error('Task deletion exception', err);
        return { success: false, error: err.message || 'Unknown error' };
    }
}

// ============ PERMISSION CHECKS ============

/**
 * Check if user can assign/edit tasks in a project
 */
export function canUserAssignTasks(user: User | null, project: Project | null): boolean {
    if (!user || !project) return false;
    return isAdmin(user) || isProjectLead(user, project);
}

/**
 * Get assignable users from cache or fetch them
 */
export async function getAssignableUsers(
    supabase: SupabaseClient,
    cache: Record<string, User[]>,
    projectId: string
): Promise<User[]> {
    if (cache[projectId]) {
        return cache[projectId];
    }

    logger.info('Loading users for project', { projectId });

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .neq('status', 'deactivated')
        .order('name', { ascending: true });

    if (error) {
        logger.error('Failed to load users', error);
        cache[projectId] = [];
        return [];
    }

    cache[projectId] = data || [];
    return cache[projectId];
}
