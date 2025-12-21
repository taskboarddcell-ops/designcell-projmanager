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
 */
export async function updateProjectStatus(
    supabase: SupabaseClient,
    projectId: string,
    newStatus: string
): Promise<{ success: boolean; error?: string }> {
    logger.info('Updating project status', { projectId, newStatus });

    if (!['Ongoing', 'On Hold', 'Complete'].includes(newStatus)) {
        return { success: false, error: 'Invalid status value' };
    }

    try {
        const { error } = await supabase
            .from('projects')
            .update({ project_status: newStatus })
            .eq('id', projectId);

        if (error) {
            logger.error('Project status update failed', error);
            return { success: false, error: error.message };
        }

        logger.info('Project status updated successfully');
        return { success: true };
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
    logger.info('Deleting project', { projectId });

    try {
        // First delete related tasks
        const { error: tasksError } = await supabase
            .from('tasks')
            .delete()
            .eq('project_id', projectId);

        if (tasksError) {
            logger.warn('Error deleting related tasks', tasksError);
            // Continue anyway
        }

        // Delete the project
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', projectId);

        if (error) {
            logger.error('Project deletion failed', error);
            return { success: false, error: error.message };
        }

        logger.info('Project deleted successfully');
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
