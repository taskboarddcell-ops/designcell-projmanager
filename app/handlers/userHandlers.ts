// @ts-nocheck
/**
 * User Handlers
 * Phase 3: Extracted from ProjectManagerClient.tsx
 * 
 * This module handles all user-related operations including:
 * - User authentication
 * - User creation/management
 * - Role/permission checks
 * - Session management
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
    User,
    isAdmin,
    authLogger as logger,
} from './types';

// ============ CONSTANTS ============

const SESSION_KEY = 'projMgrSession';
const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

// ============ INTERFACES ============

export interface LoginParams {
    staffId: string;
    password: string;
}

export interface UserCreateParams {
    name: string;
    staffId: string;
    email?: string;
    password: string;
    accessLevel: 'Designer' | 'Team Leader' | 'Admin';
}

export interface SessionData {
    user: User;
    timestamp: number;
}

// ============ AUTHENTICATION ============

/**
 * Attempt to login a user
 */
export async function loginUser(
    supabase: SupabaseClient,
    params: LoginParams
): Promise<{ success: boolean; user?: User; error?: string }> {
    logger.info('Login attempt', { staffId: params.staffId });

    const { staffId, password } = params;

    if (!staffId || !password) {
        return { success: false, error: 'Staff ID and password are required' };
    }

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('staff_id', staffId)
            .single();

        if (error || !user) {
            logger.warn('User not found', { staffId });
            return { success: false, error: 'Invalid credentials' };
        }

        if (user.status === 'deactivated') {
            logger.warn('Deactivated user login attempt', { staffId });
            return { success: false, error: 'Account has been deactivated' };
        }

        // Dynamic import of bcryptjs for password verification
        const bcrypt = await import('bcryptjs');
        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            logger.warn('Invalid password', { staffId });
            return { success: false, error: 'Invalid credentials' };
        }

        // Remove password from returned user object
        const { password: _, ...safeUser } = user;

        logger.info('Login successful', { staffId, accessLevel: user.access_level });
        return { success: true, user: safeUser };
    } catch (err: any) {
        logger.error('Login exception', err);
        return { success: false, error: err.message || 'Login failed' };
    }
}

// ============ SESSION MANAGEMENT ============

/**
 * Save session to localStorage
 */
export function saveSession(user: User): void {
    const session: SessionData = {
        user,
        timestamp: Date.now(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    logger.info('Session saved', { staffId: user.staff_id });
}

/**
 * Load session from localStorage
 */
export function loadSession(): User | null {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;

        const session: SessionData = JSON.parse(raw);
        const age = Date.now() - session.timestamp;

        if (age > SESSION_TIMEOUT_MS) {
            logger.info('Session expired');
            clearSession();
            return null;
        }

        // Touch the session (extend timeout)
        saveSession(session.user);
        logger.info('Session restored', { staffId: session.user.staff_id });
        return session.user;
    } catch (err) {
        logger.warn('Failed to load session', err);
        return null;
    }
}

/**
 * Clear session from localStorage
 */
export function clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
    logger.info('Session cleared');
}

// ============ USER MANAGEMENT ============

/**
 * Create a new user
 */
export async function createUser(
    supabase: SupabaseClient,
    params: UserCreateParams
): Promise<{ success: boolean; user?: User; error?: string }> {
    logger.info('Creating user', { staffId: params.staffId, name: params.name });

    // Validate inputs
    if (!params.name || !params.staffId || !params.password) {
        return { success: false, error: 'Name, Staff ID, and password are required' };
    }

    try {
        // Check if user already exists
        const { data: existing } = await supabase
            .from('users')
            .select('staff_id')
            .eq('staff_id', params.staffId)
            .single();

        if (existing) {
            return { success: false, error: 'Staff ID already exists' };
        }

        // Hash the password
        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.hash(params.password, 10);

        // Create user
        const { data, error } = await supabase
            .from('users')
            .insert({
                name: params.name.trim(),
                staff_id: params.staffId.trim(),
                email: params.email?.trim() || null,
                password: hashedPassword,
                access_level: params.accessLevel,
                status: 'active',
            })
            .select()
            .single();

        if (error) {
            logger.error('User creation failed', error);
            return { success: false, error: error.message };
        }

        // Remove password from returned user
        const { password: _, ...safeUser } = data;
        logger.info('User created successfully', { staffId: params.staffId });
        return { success: true, user: safeUser };
    } catch (err: any) {
        logger.error('User creation exception', err);
        return { success: false, error: err.message || 'Unknown error' };
    }
}

/**
 * Update user details
 */
export async function updateUser(
    supabase: SupabaseClient,
    staffId: string,
    updates: Partial<Omit<User, 'staff_id'>>
): Promise<{ success: boolean; error?: string }> {
    logger.info('Updating user', { staffId });

    try {
        const updateData: any = {};

        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.email !== undefined) updateData.email = updates.email;
        if (updates.access_level !== undefined) updateData.access_level = updates.access_level;
        if (updates.status !== undefined) updateData.status = updates.status;

        const { error } = await supabase
            .from('users')
            .update(updateData)
            .eq('staff_id', staffId);

        if (error) {
            logger.error('User update failed', error);
            return { success: false, error: error.message };
        }

        logger.info('User updated successfully');
        return { success: true };
    } catch (err: any) {
        logger.error('User update exception', err);
        return { success: false, error: err.message || 'Unknown error' };
    }
}

/**
 * Deactivate a user (soft delete)
 */
export async function deactivateUser(
    supabase: SupabaseClient,
    staffId: string
): Promise<{ success: boolean; error?: string }> {
    logger.info('Deactivating user', { staffId });

    try {
        const { error } = await supabase
            .from('users')
            .update({ status: 'deactivated' })
            .eq('staff_id', staffId);

        if (error) {
            logger.error('User deactivation failed', error);
            return { success: false, error: error.message };
        }

        logger.info('User deactivated successfully');
        return { success: true };
    } catch (err: any) {
        logger.error('User deactivation exception', err);
        return { success: false, error: err.message || 'Unknown error' };
    }
}

/**
 * Reactivate a deactivated user
 */
export async function reactivateUser(
    supabase: SupabaseClient,
    staffId: string
): Promise<{ success: boolean; error?: string }> {
    logger.info('Reactivating user', { staffId });

    try {
        const { error } = await supabase
            .from('users')
            .update({ status: 'active' })
            .eq('staff_id', staffId);

        if (error) {
            logger.error('User reactivation failed', error);
            return { success: false, error: error.message };
        }

        logger.info('User reactivated successfully');
        return { success: true };
    } catch (err: any) {
        logger.error('User reactivation exception', err);
        return { success: false, error: err.message || 'Unknown error' };
    }
}

/**
 * Reset user password
 */
export async function resetUserPassword(
    supabase: SupabaseClient,
    staffId: string,
    newPassword: string
): Promise<{ success: boolean; error?: string }> {
    logger.info('Resetting password', { staffId });

    if (!newPassword || newPassword.length < 4) {
        return { success: false, error: 'Password must be at least 4 characters' };
    }

    try {
        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const { error } = await supabase
            .from('users')
            .update({ password: hashedPassword })
            .eq('staff_id', staffId);

        if (error) {
            logger.error('Password reset failed', error);
            return { success: false, error: error.message };
        }

        logger.info('Password reset successfully');
        return { success: true };
    } catch (err: any) {
        logger.error('Password reset exception', err);
        return { success: false, error: err.message || 'Unknown error' };
    }
}

// ============ USER QUERIES ============

/**
 * Fetch all active users
 */
export async function fetchActiveUsers(
    supabase: SupabaseClient
): Promise<{ success: boolean; users: User[]; error?: string }> {
    logger.info('Fetching active users');

    try {
        const { data, error } = await supabase
            .from('users')
            .select('staff_id, name, email, access_level, status, created_at')
            .neq('status', 'deactivated')
            .order('name', { ascending: true });

        if (error) {
            logger.error('Failed to fetch users', error);
            return { success: false, users: [], error: error.message };
        }

        logger.info(`Fetched ${data?.length || 0} active users`);
        return { success: true, users: data || [] };
    } catch (err: any) {
        logger.error('Fetch users exception', err);
        return { success: false, users: [], error: err.message };
    }
}

/**
 * Fetch all users including deactivated
 */
export async function fetchAllUsers(
    supabase: SupabaseClient
): Promise<{ success: boolean; users: User[]; error?: string }> {
    logger.info('Fetching all users');

    try {
        const { data, error } = await supabase
            .from('users')
            .select('staff_id, name, email, access_level, status, created_at')
            .order('name', { ascending: true });

        if (error) {
            logger.error('Failed to fetch users', error);
            return { success: false, users: [], error: error.message };
        }

        logger.info(`Fetched ${data?.length || 0} total users`);
        return { success: true, users: data || [] };
    } catch (err: any) {
        logger.error('Fetch users exception', err);
        return { success: false, users: [], error: err.message };
    }
}
