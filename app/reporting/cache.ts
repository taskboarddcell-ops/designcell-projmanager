import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { ReportRequest, ReportRun, ReportArtifact, ReportFilters, ReportMetrics, GeminiNarrative } from './types';

const SCHEMA_VERSION = '1.0';
const ANALYTICS_VERSION = '1.0';
const TEMPLATE_VERSION = '1.0';
const GEMINI_MODEL = 'gemini-2.0-flash-exp';

/**
 * Generate deterministic cache key from report parameters
 */
export function generateCacheKey(request: ReportRequest): string {
    const normalized = {
        type: request.reportType,
        start: request.startDate,
        end: request.endDate,
        tz: request.timezone || 'UTC',
        filters: normalizeFilters(request),
        schema: SCHEMA_VERSION,
        analytics: ANALYTICS_VERSION,
        template: TEMPLATE_VERSION,
    };

    const payload = JSON.stringify(normalized, Object.keys(normalized).sort());
    return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Normalize filters for consistent hashing
 */
function normalizeFilters(request: ReportRequest): ReportFilters {
    const filters: ReportFilters = {};

    if (request.projectIds && request.projectIds.length > 0) {
        filters.projectIds = [...request.projectIds].sort();
    }

    if (request.staffId) {
        filters.staffId = request.staffId;
    }

    return filters;
}

/**
 * Generate data fingerprint based on underlying data state
 */
export async function generateDataFingerprint(
    supabase: SupabaseClient,
    request: ReportRequest
): Promise<string> {
    const { startDate, endDate, projectIds, staffId } = request;

    // Query for max timestamps and counts in scope
    let tasksQuery = supabase
        .from('tasks')
        .select('created_at, completed_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

    if (projectIds && projectIds.length > 0) {
        tasksQuery = tasksQuery.in('project_id', projectIds);
    }

    if (staffId) {
        tasksQuery = tasksQuery.contains('assignee_ids', [staffId]);
    }

    const { data: tasks } = await tasksQuery;

    // Get max changed_at from logs
    const { data: logs } = await supabase
        .from('task_status_log')
        .select('changed_at')
        .order('changed_at', { ascending: false })
        .limit(1);

    const fingerprint = {
        taskCount: tasks?.length || 0,
        maxCreated: tasks?.reduce((max, t) => t.created_at > max ? t.created_at : max, ''),
        maxCompleted: tasks?.reduce((max, t) => (t.completed_at && t.completed_at > max) ? t.completed_at : max, ''),
        maxLogChange: logs?.[0]?.changed_at || '',
    };

    return crypto.createHash('sha256').update(JSON.stringify(fingerprint)).digest('hex');
}

/**
 * Generate prompt fingerprint from facts packet
 */
export function generatePromptFingerprint(factsPacket: any): string {
    // Hash the facts packet to detect changes in what we send to Gemini
    const payload = JSON.stringify(factsPacket);
    return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Check if cached report exists and is valid
 */
export async function findCachedReport(
    supabase: SupabaseClient,
    cacheKey: string,
    dataFingerprint: string
): Promise<{ run: ReportRun; artifact: ReportArtifact } | null> {
    const { data: runs } = await supabase
        .from('report_runs')
        .select('*')
        .eq('cache_key', cacheKey)
        .eq('data_fingerprint', dataFingerprint)
        .eq('status', 'generated')
        .order('created_at', { ascending: false })
        .limit(1);

    if (!runs || runs.length === 0) return null;

    const run = runs[0] as ReportRun;

    const { data: artifacts } = await supabase
        .from('report_artifacts')
        .select('*')
        .eq('report_run_id', run.id)
        .single();

    if (!artifacts) return null;

    return { run, artifact: artifacts as ReportArtifact };
}

/**
 * Save report run and artifacts to cache
 * NOTE: We only store JSON data, not HTML. HTML is rendered on-demand from the template.
 */
export async function saveReportToCache(
    supabase: SupabaseClient,
    request: ReportRequest,
    cacheKey: string,
    dataFingerprint: string,
    promptFingerprint: string,
    metrics: ReportMetrics,
    narrative: GeminiNarrative,
    userId?: string,
    userName?: string,
    durationMs?: number
): Promise<{ runId: string; artifactId: string }> {
    // Create report run
    const { data: run, error: runError } = await supabase
        .from('report_runs')
        .insert({
            report_type: request.reportType,
            start_date: request.startDate,
            end_date: request.endDate,
            timezone: request.timezone || 'UTC',
            filters_json: normalizeFilters(request),
            schema_version: SCHEMA_VERSION,
            analytics_version: ANALYTICS_VERSION,
            template_version: TEMPLATE_VERSION,
            gemini_model_version: GEMINI_MODEL,
            cache_key: cacheKey,
            data_fingerprint: dataFingerprint,
            prompt_fingerprint: promptFingerprint,
            status: 'generated',
            created_by_id: userId,
            created_by_name: userName,
            generation_duration_ms: durationMs,
        })
        .select()
        .single();

    if (runError || !run) {
        throw new Error(`Failed to save report run: ${runError?.message}`);
    }

    // Generate checksum for data integrity
    const dataPayload = JSON.stringify({ metrics, narrative });
    const checksum = crypto.createHash('sha256').update(dataPayload).digest('hex');

    // Create artifact - ONLY store JSON data, not HTML
    const { data: artifact, error: artifactError } = await supabase
        .from('report_artifacts')
        .insert({
            report_run_id: run.id,
            narrative_json: narrative,
            metrics_json: metrics,
            checksum,
        })
        .select()
        .single();

    if (artifactError || !artifact) {
        throw new Error(`Failed to save report artifact: ${artifactError?.message}`);
    }

    return { runId: run.id, artifactId: artifact.id };
}

/**
 * Get report history
 */
export async function getReportHistory(
    supabase: SupabaseClient,
    filters: {
        reportType?: string;
        startDate?: string;
        endDate?: string;
        limit?: number;
    }
): Promise<ReportRun[]> {
    let query = supabase
        .from('report_runs')
        .select(`
            *,
            artifact:report_artifacts!inner(id)
        `)
        .eq('status', 'generated')
        .order('created_at', { ascending: false });

    if (filters.reportType) {
        query = query.eq('report_type', filters.reportType);
    }

    if (filters.startDate) {
        query = query.gte('start_date', filters.startDate);
    }

    if (filters.endDate) {
        query = query.lte('end_date', filters.endDate);
    }

    if (filters.limit) {
        query = query.limit(filters.limit);
    }

    const { data } = await query;
    return (data as ReportRun[]) || [];
}

/**
 * Get report by ID
 */
export async function getReportById(
    supabase: SupabaseClient,
    reportRunId: string
): Promise<{ run: ReportRun; artifact: ReportArtifact } | null> {
    const { data: run } = await supabase
        .from('report_runs')
        .select('*')
        .eq('id', reportRunId)
        .single();

    if (!run) return null;

    const { data: artifact } = await supabase
        .from('report_artifacts')
        .select('*')
        .eq('report_run_id', reportRunId)
        .single();

    if (!artifact) return null;

    return { run: run as ReportRun, artifact: artifact as ReportArtifact };
}
