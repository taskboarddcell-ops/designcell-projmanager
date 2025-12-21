// @ts-nocheck
/**
 * Shared types and interfaces for the Project Manager
 * Phase 3: Code restructuring - Extract types to separate module
 */

import { SupabaseClient } from '@supabase/supabase-js';

// ============ TYPE DEFINITIONS ============

export interface User {
    staff_id: string;
    name: string;
    email?: string;
    access_level: 'Designer' | 'Team Leader' | 'Admin';
    status?: 'active' | 'deactivated';
    password?: string;
    created_at?: string;
}

export interface Project {
    id: string;
    name: string;
    type: string;
    lead_ids: string[];
    stage_plan: StagePlan[];
    project_status?: string;
    status?: string;
    created_at?: string;
}

export interface StagePlan {
    stage: string;
    name?: string;
    subs?: string[];
    sub_stages?: string[];
}

export interface Task {
    id: string;
    project_id: string;
    project_name: string;
    stage_id: string;
    sub_id: string;
    task: string;
    description?: string;
    due: string;
    priority: 'High' | 'Medium' | 'Low';
    status: 'Pending' | 'In Progress' | 'Complete';
    assignee_ids: string[];
    assignees: string[];
    current_status?: string;
    completed_at?: string;
    completed_by?: string;
    reschedule_remarks?: string;
    completion_remarks?: string;
    created_at?: string;
    created_by_id?: string;
    created_by_name?: string;
}

export interface AssignState {
    proj: Project | null;
    stage: string;
    sub: string;
    taskId: string;
    isBulk: boolean;
    bulkStage: string;
}

export interface Notification {
    id: string;
    user_id: string;
    type: 'TASK_ASSIGNED' | 'TASK_OVERDUE' | 'DAILY_DIGEST' | 'TASK_STATUS_UPDATE';
    title: string;
    body?: string;
    link_url?: string;
    is_read: boolean;
    read_at?: string;
    created_at?: string;
}

// ============ UTILITY FUNCTIONS ============

/**
 * HTML escape function to prevent XSS
 */
export function esc(str: any): string {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Format date for display
 */
export function formatDate(d: string | Date | null | undefined): string {
    if (!d) return '-';
    try {
        return new Date(d).toLocaleDateString();
    } catch {
        return String(d);
    }
}

/**
 * Extract year from project name (e.g., "2024-01 Project Name" -> 2024)
 */
export function getProjectYear(name: string): number {
    const match = (name || '').match(/^(\d{4})/);
    return match ? parseInt(match[1], 10) : 9999;
}

/**
 * Stage ordering for consistent display
 */
export const STAGE_ORDER = [
    'PRELIMINARY',
    'ARCHITECTURAL DRAWINGS',
    'STRUCTURAL DRAWINGS',
    'SANITARY DRAWINGS',
    'ELECTRICAL DRAWINGS',
    'SITE DEVELOPMENT DRAWING',
    'MUNICIPAL',
];

export const STAGE_ORDER_MAP = new Map(
    STAGE_ORDER.map((name, idx) => [name.toUpperCase(), idx])
);

// ============ LOGGING UTILITIES ============

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const LOG_COLORS: Record<LogLevel, string> = {
    DEBUG: '\x1b[36m', // cyan
    INFO: '\x1b[32m',  // green
    WARN: '\x1b[33m',  // yellow
    ERROR: '\x1b[31m', // red
};

/**
 * Structured logging with timestamp and category
 */
export function log(category: string, level: LogLevel, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${category}] [${level}]`;

    if (data !== undefined) {
        console.log(`${prefix} ${message}`, data);
    } else {
        console.log(`${prefix} ${message}`);
    }
}

/**
 * Logger factory for specific categories
 */
export function createLogger(category: string) {
    return {
        debug: (msg: string, data?: any) => log(category, 'DEBUG', msg, data),
        info: (msg: string, data?: any) => log(category, 'INFO', msg, data),
        warn: (msg: string, data?: any) => log(category, 'WARN', msg, data),
        error: (msg: string, data?: any) => log(category, 'ERROR', msg, data),
    };
}

// Pre-built loggers for common categories
export const assignLogger = createLogger('ASSIGN');
export const projectLogger = createLogger('PROJECT');
export const taskLogger = createLogger('TASK');
export const authLogger = createLogger('AUTH');

// ============ VALIDATION UTILITIES ============

/**
 * Validate that a sub_id is valid (not "(All Sub-stages)" or empty)
 */
export function isValidSubId(subId: string | null | undefined): boolean {
    if (!subId) return false;
    if (subId.trim() === '') return false;
    if (subId === '(All Sub-stages)') return false;
    return true;
}

/**
 * Validate that a project reference is still valid
 */
export function validateProjectContext(
    proj: Project | null,
    activeProjectName: string,
    projects: Project[]
): Project | null {
    if (!proj) {
        // Try to resolve from active project name
        if (activeProjectName) {
            return projects.find(p => p.name === activeProjectName) || null;
        }
        return null;
    }

    // Validate project still matches active context
    if (activeProjectName && proj.name !== activeProjectName) {
        return projects.find(p => p.name === activeProjectName) || null;
    }

    return proj;
}

// ============ PERMISSION UTILITIES ============

/**
 * Check if user is an admin
 */
export function isAdmin(user: User | null): boolean {
    return user?.access_level === 'Admin';
}

/**
 * Check if user is a lead for a specific project
 */
export function isProjectLead(user: User | null, project: Project | null): boolean {
    if (!user || !project) return false;
    return (project.lead_ids || []).includes(user.staff_id);
}

/**
 * Check if user is an assignee of a task
 */
export function isTaskAssignee(user: User | null, task: Task | null): boolean {
    if (!user || !task) return false;
    return (task.assignee_ids || []).includes(user.staff_id);
}

/**
 * Check if user can see a task based on permissions
 */
export function canUserSeeTask(user: User | null, task: Task | null, projects: Project[]): boolean {
    if (!user || !task) return false;
    if (isAdmin(user)) return true;
    if (isTaskAssignee(user, task)) return true;
    if (task.created_by_id === user.staff_id) return true;

    // Check if user is a lead for the task's project
    if (task.project_id) {
        const project = projects.find(p => p.id === task.project_id);
        if (project && isProjectLead(user, project)) return true;
    }

    return false;
}

/**
 * Check if user can edit project layout
 */
export function canEditProject(user: User | null, project: Project | null): boolean {
    if (!user || !project) return false;
    if (isAdmin(user)) return true;
    return isProjectLead(user, project);
}
