// @ts-nocheck
/**
 * Handlers Index
 * Phase 3: Central export point for all handler modules
 * 
 * Usage:
 * import { createTask, loginUser, fetchProjects } from './handlers';
 */

// Types and utilities
export {
    type Task, type Project, type User, type AssignState,
    esc, formatDate, getProjectYear, isAdmin, canUserChangeTaskStatus,
    STAGE_ORDER, getStageAbbr, getConciseTaskTitle, getConciseSubTitle, getDisplayStatus
} from './types';

// Task handlers
export {
    createTask,
    updateTask,
    deleteTask,
    bulkDeleteTasks,
    bulkAssignTasks,
    updateTaskStatus,
    canUserAssignTasks,
    getAssignableUsers,
    type TaskCreateParams,
    type TaskUpdateParams,
    type BulkAssignParams,
    type BulkAssignResult,
} from './taskHandlers';

// Project handlers
export {
    createProject,
    updateProject,
    updateProjectStatus,
    deleteProject,
    updateStagePlan,
    parseStagePlanFromEditor,
    fetchProjects,
    fetchProjectById,
    adjustTaskDatesAfterHold,
    sortProjectsByYear,
    filterProjectsByYear,
    getUniqueProjectYears,
    canUserEditProject,
    type ProjectCreateParams,
    type ProjectUpdateParams,
} from './projectHandlers';

// User handlers
export {
    loginUser,
    saveSession,
    loadSession,
    clearSession,
    createUser,
    updateUser,
    deactivateUser,
    reactivateUser,
    resetUserPassword,
    fetchActiveUsers,
    fetchAllUsers,
    type LoginParams,
    type UserCreateParams,
    type SessionData,
} from './userHandlers';
