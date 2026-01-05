// @ts-nocheck
/**
 * Project Handlers
 * Phase 3: Extracted from ProjectManagerClient.tsx
 * 
 * This module handles all project-related operations including:
 * - Project creation
 * - Project updates
 * - Project status management
 * - Stage plan management
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
    Project,
    User,
    StagePlan,
    esc,
    isAdmin,
    isProjectLead,
    getProjectYear,
    projectLogger as logger,
} from './types';

// ============ INTERFACES ============

export interface ProjectCreateParams {
    name: string;
    type: string;
    leadIds: string[];
    stagePlan: StagePlan[];
    createdById: string;
}

export interface ProjectUpdateParams {
    projectId: string;
    name?: string;
    type?: string;
    leadIds?: string[];
    stagePlan?: StagePlan[];
    status?: string;
}

// ============ PROJECT CRUD ============

/**
 * Create a new project
 */
export async function createProject(
    supabase: SupabaseClient,
    params: ProjectCreateParams
): Promise<{ success: boolean; project?: Project; error?: string }> {
    logger.info('Creating project', { name: params.name, type: params.type });

    // Validate project name
    if (!params.name || params.name.trim() === '') {
        return { success: false, error: 'Project name is required' };
    }

    try {
        const { data, error } = await supabase
            .from('projects')
            .insert({
                name: params.name.trim(),
                type: params.type || 'General',
                lead_ids: params.leadIds || [],
                stage_plan: params.stagePlan || [],
                project_status: 'Ongoing',
                created_by: params.createdById,
            })
            .select()
            .single();

        if (error) {
            logger.error('Project creation failed', error);
            return { success: false, error: error.message };
        }

        logger.info('Project created successfully', { projectId: data.id });
        return { success: true, project: data };
    } catch (err: any) {
        logger.error('Project creation exception', err);
        return { success: false, error: err.message || 'Unknown error' };
    }
}

/**
 * Update project details
 */
export async function updateProject(
    supabase: SupabaseClient,
    params: ProjectUpdateParams
): Promise<{ success: boolean; error?: string }> {
    logger.info('Updating project', { projectId: params.projectId });

    const updateData: any = {};
    if (params.name !== undefined) updateData.name = params.name;
    if (params.type !== undefined) updateData.type = params.type;
    if (params.leadIds !== undefined) updateData.lead_ids = params.leadIds;
    if (params.stagePlan !== undefined) updateData.stage_plan = params.stagePlan;
    if (params.status !== undefined) updateData.project_status = params.status;

    try {
        const { error } = await supabase
            .from('projects')
            .update(updateData)
            .eq('id', params.projectId);

        if (error) {
            logger.error('Project update failed', error);
            return { success: false, error: error.message };
        }

        logger.info('Project updated successfully');
        return { success: true };
    } catch (err: any) {
        logger.error('Project update exception', err);
        return { success: false, error: err.message || 'Unknown error' };
    }
}

/**
 * Update project status
 * Now tracks hold/resume timestamps and calculates hold duration
 */
export async function updateProjectStatus(
    supabase: SupabaseClient,
    projectId: string,
    newStatus: string
): Promise<{ success: boolean; error?: string; holdDuration?: number }> {
    logger.info('Updating project status', { projectId, newStatus });

    if (!['Ongoing', 'On Hold', 'Complete'].includes(newStatus)) {
        return { success: false, error: 'Invalid status value' };
    }

    try {
        // First, fetch the current project to check current status
        const { data: currentProject, error: fetchError } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();

        if (fetchError || !currentProject) {
            logger.error('Failed to fetch project for status update', fetchError);
            return { success: false, error: 'Project not found' };
        }

        const updateData: any = { project_status: newStatus };
        let holdDuration = 0;

        // Handle "On Hold" status
        if (newStatus === 'On Hold' && currentProject.project_status !== 'On Hold') {
            // Project is being put on hold
            updateData.on_hold_since = new Date().toISOString();
            logger.info('Project put on hold', { projectId, timestamp: updateData.on_hold_since });
        }

        // Handle resume from "On Hold"
        if (currentProject.project_status === 'On Hold' && newStatus !== 'On Hold') {
            // Project is being resumed
            updateData.last_resumed_at = new Date().toISOString();

            // Calculate hold duration if on_hold_since exists
            if (currentProject.on_hold_since) {
                const holdStart = new Date(currentProject.on_hold_since);
                const holdEnd = new Date();
                const daysOnHold = Math.ceil((holdEnd.getTime() - holdStart.getTime()) / (1000 * 60 * 60 * 24));

                // Add to cumulative hold duration
                holdDuration = (currentProject.hold_duration || 0) + daysOnHold;
                updateData.hold_duration = holdDuration;

                logger.info('Project resumed from hold', {
                    projectId,
                    daysOnHold,
                    totalHoldDuration: holdDuration
                });
            }

            // Clear on_hold_since
            updateData.on_hold_since = null;
        }

        const { error } = await supabase
            .from('projects')
            .update(updateData)
            .eq('id', projectId);

        if (error) {
            logger.error('Project status update failed', error);
            return { success: false, error: error.message };
        }

        logger.info('Project status updated successfully');
        return { success: true, holdDuration };
    } catch (err: any) {
        logger.error('Project status update exception', err);
        return { success: false, error: err.message || 'Unknown error' };
    }
}

/**
 * Delete a project (with confirmation)
 */
export async function deleteProject(
    supabase: SupabaseClient,
    projectId: string
): Promise<{ success: boolean; error?: string }> {
    logger.info('Deleting project (soft)', { projectId });

    try {
        // Soft delete related tasks
        const { error: tasksError } = await supabase
            .from('tasks')
            .update({ is_deleted: true, deleted_at: new Date().toISOString() })
            .eq('project_id', projectId);

        if (tasksError) {
            logger.warn('Error soft deleting related tasks', tasksError);
            // Continue anyway
        }

        // Soft delete the project
        const { error } = await supabase
            .from('projects')
            .update({ is_deleted: true, deleted_at: new Date().toISOString() })
            .eq('id', projectId);

        if (error) {
            logger.error('Project deletion failed', error);
            return { success: false, error: error.message };
        }

        logger.info('Project soft deleted successfully');
        return { success: true };
    } catch (err: any) {
        logger.error('Project deletion exception', err);
        return { success: false, error: err.message || 'Unknown error' };
    }
}

// ============ STAGE PLAN MANAGEMENT ============

/**
 * Update project stage plan
 */
export async function updateStagePlan(
    supabase: SupabaseClient,
    projectId: string,
    stagePlan: StagePlan[]
): Promise<{ success: boolean; error?: string }> {
    logger.info('Updating stage plan', { projectId, stageCount: stagePlan.length });

    // Normalize the stage plan
    const normalizedPlan = stagePlan.map((s) => ({
        stage: s.stage || s.name || '',
        subs: s.subs || s.sub_stages || [],
    }));

    try {
        const { error } = await supabase
            .from('projects')
            .update({ stage_plan: normalizedPlan })
            .eq('id', projectId);

        if (error) {
            logger.error('Stage plan update failed', error);
            return { success: false, error: error.message };
        }

        logger.info('Stage plan updated successfully');
        return { success: true };
    } catch (err: any) {
        logger.error('Stage plan update exception', err);
        return { success: false, error: err.message || 'Unknown error' };
    }
}

/**
 * Parse stage plan from editor DOM
 */
export function parseStagePlanFromEditor(container: HTMLElement): StagePlan[] {
    const stages: StagePlan[] = [];

    container.querySelectorAll('.stage-edit-group').forEach((group) => {
        const nameInput = group.querySelector<HTMLInputElement>('.stage-name-input');
        const stageName = nameInput?.value?.trim() || '';

        if (!stageName) return;

        const subs: string[] = [];
        group.querySelectorAll<HTMLInputElement>('.sub-name-input').forEach((subInput) => {
            const subName = subInput.value?.trim();
            if (subName) subs.push(subName);
        });

        stages.push({ stage: stageName, subs });
    });

    return stages;
}

// ============ PROJECT QUERIES ============

/**
 * Fetch all projects
 */
export async function fetchProjects(
    supabase: SupabaseClient
): Promise<{ success: boolean; projects: Project[]; error?: string }> {
    logger.info('Fetching projects');

    try {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('is_deleted', false) // Filter out deleted projects
            .order('name', { ascending: true });

        if (error) {
            logger.error('Failed to fetch projects', error);
            return { success: false, projects: [], error: error.message };
        }

        logger.info(`Fetched ${data?.length || 0} projects`);
        return { success: true, projects: data || [] };
    } catch (err: any) {
        logger.error('Fetch projects exception', err);
        return { success: false, projects: [], error: err.message };
    }
}

/**
 * Fetch project by ID
 */
export async function fetchProjectById(
    supabase: SupabaseClient,
    projectId: string
): Promise<{ success: boolean; project?: Project; error?: string }> {
    logger.info('Fetching project by ID', { projectId });

    try {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();

        if (error) {
            logger.error('Failed to fetch project', error);
            return { success: false, error: error.message };
        }

        return { success: true, project: data };
    } catch (err: any) {
        logger.error('Fetch project exception', err);
        return { success: false, error: err.message };
    }
}

/**
 * Adjust task due dates after project hold
 * Shifts all pending/in-progress task due dates forward by the hold duration
 */
export async function adjustTaskDatesAfterHold(
    supabase: SupabaseClient,
    projectId: string,
    daysToShift: number
): Promise<{ success: boolean; updatedCount: number; error?: string }> {
    logger.info('Adjusting task dates after hold', { projectId, daysToShift });

    try {
        // Fetch all pending/in-progress tasks for this project
        const { data: tasks, error: fetchError } = await supabase
            .from('tasks')
            .select('*')
            .eq('project_id', projectId)
            .in('status', ['Pending', 'In Progress'])
            .eq('is_deleted', false);

        if (fetchError) {
            logger.error('Failed to fetch tasks for date adjustment', fetchError);
            return { success: false, updatedCount: 0, error: fetchError.message };
        }

        if (!tasks || tasks.length === 0) {
            logger.info('No tasks to adjust');
            return { success: true, updatedCount: 0 };
        }

        let updatedCount = 0;

        // Update each task's due date
        for (const task of tasks) {
            const currentDue = new Date(task.due);
            const newDue = new Date(currentDue);
            newDue.setDate(newDue.getDate() + daysToShift);

            const { error: updateError } = await supabase
                .from('tasks')
                .update({ due: newDue.toISOString().split('T')[0] })
                .eq('id', task.id);

            if (updateError) {
                logger.error('Failed to update task date', { taskId: task.id, error: updateError });
            } else {
                updatedCount++;
            }
        }

        logger.info('Task dates adjusted', { updatedCount, totalTasks: tasks.length });
        return { success: true, updatedCount };
    } catch (err: any) {
        logger.error('Adjust task dates exception', err);
        return { success: false, updatedCount: 0, error: err.message };
    }
}

// ============ PROJECT UTILITIES ============

/**
 * Sort projects by year (extracted from name)
 */
export function sortProjectsByYear(projects: Project[], ascending = true): Project[] {
    return [...projects].sort((a, b) => {
        const yearA = getProjectYear(a.name);
        const yearB = getProjectYear(b.name);
        return ascending ? yearA - yearB : yearB - yearA;
    });
}

/**
 * Filter projects by year
 */
export function filterProjectsByYear(projects: Project[], year: number | 'All'): Project[] {
    if (year === 'All') return projects;
    return projects.filter((p) => getProjectYear(p.name) === year);
}

/**
 * Get unique years from project names
 */
export function getUniqueProjectYears(projects: Project[]): number[] {
    const years = projects
        .map((p) => getProjectYear(p.name))
        .filter((y) => y !== 9999);
    return Array.from(new Set(years)).sort((a, b) => a - b);
}

/**
 * Check if user can edit project
 */
export function canUserEditProject(user: User | null, project: Project | null): boolean {
    if (!user || !project) return false;
    return isAdmin(user) || isProjectLead(user, project);
}
