import { supabase, fetchReportData, fetchPriorPeriodData } from './dal';
import { computeMetrics, computeComparison } from './analytics';
import { buildFactsPacket, generateNarrative } from './gemini';
import { renderHtml } from './htmlTemplate';
import { generatePdf } from './pdf';
import {
    generateCacheKey,
    generateDataFingerprint,
    generatePromptFingerprint,
    findCachedReport,
    saveReportToCache,
    getReportHistory,
    getReportById
} from './cache';
import { ReportRequest, FullReportData } from './types';

/**
 * Main report generation function with caching
 * HTML is rendered on-demand from cached JSON data
 */
export async function generateReport(
    request: ReportRequest,
    userId?: string,
    userName?: string
): Promise<{ html: string; pdf?: Buffer; reportRunId: string; fromCache: boolean }> {
    const startTime = Date.now();

    // Generate cache key
    const cacheKey = generateCacheKey(request);

    // Generate data fingerprint
    const dataFingerprint = await generateDataFingerprint(supabase, request);

    // Check cache unless regenerate flag is set
    if (!request.regenerate) {
        const cached = await findCachedReport(supabase, cacheKey, dataFingerprint);

        if (cached) {
            console.log('✅ Cache hit - rendering from cached data');

            // Render HTML from cached JSON data
            const reportData: FullReportData = {
                meta: request,
                metrics: cached.artifact.metrics_json as any,
                narrative: cached.artifact.narrative_json as any,
                factsPacket: buildFactsPacket(request, cached.artifact.metrics_json as any)
            };

            const html = renderHtml(reportData);

            let pdf: Buffer | undefined;
            if (request.output === 'pdf') {
                pdf = await generatePdf(html);
            }

            return {
                html,
                pdf,
                reportRunId: cached.run.id,
                fromCache: true
            };
        }
    }

    console.log('🔄 Cache miss - generating new report');

    // Fetch data
    const data = await fetchReportData(request);

    // Compute metrics
    const metrics = computeMetrics(
        data.tasks,
        data.logs,
        data.profiles,
        request.startDate,
        request.endDate,
        request.timezone || 'UTC'
    );

    // Compute comparison if possible
    try {
        const priorData = await fetchPriorPeriodData(request);
        const priorMetrics = computeMetrics(
            priorData.tasks,
            priorData.logs,
            priorData.profiles,
            request.startDate,
            request.endDate,
            request.timezone || 'UTC'
        );
        metrics.comparison = computeComparison(metrics, priorMetrics);
    } catch (error) {
        console.warn('Could not compute prior period comparison:', error);
    }

    // Build facts packet
    const factsPacket = buildFactsPacket(request, metrics);

    // Generate prompt fingerprint
    const promptFingerprint = generatePromptFingerprint(factsPacket);

    // Generate narrative with Gemini
    const narrative = await generateNarrative(factsPacket);

    // Save JSON data to cache (NOT HTML)
    const durationMs = Date.now() - startTime;
    const { runId } = await saveReportToCache(
        supabase,
        request,
        cacheKey,
        dataFingerprint,
        promptFingerprint,
        metrics,
        narrative,
        userId,
        userName,
        durationMs
    );

    // Render HTML on-demand from the data
    const reportData: FullReportData = {
        meta: request,
        metrics,
        narrative,
        factsPacket
    };

    const html = renderHtml(reportData);

    // Generate PDF if requested
    let pdf: Buffer | undefined;
    if (request.output === 'pdf') {
        pdf = await generatePdf(html);
    }

    console.log(`✅ Report generated in ${durationMs}ms and cached (JSON only)`);

    return {
        html,
        pdf,
        reportRunId: runId,
        fromCache: false
    };
}

/**
 * Get report history
 */
export { getReportHistory, getReportById };

/**
 * Re-export for convenience
 */
export { generatePdf };
