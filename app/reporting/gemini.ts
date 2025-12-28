import { ReportMetrics, GeminiNarrative, FactsPacket, ReportRequest } from './types';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

/**
 * Build Facts Packet for Gemini
 */
export function buildFactsPacket(
    request: ReportRequest,
    metrics: ReportMetrics
): FactsPacket {
    return {
        report_meta: {
            type: request.reportType,
            start_date: request.startDate,
            end_date: request.endDate,
            timezone: request.timezone || 'UTC',
            filters: {
                projectIds: request.projectIds,
                staffId: request.staffId
            },
            generated_at: metrics.generatedAt
        },
        computed_metrics: metrics,
        key_lists: {
            top_aging: metrics.topAgingTasks,
            top_overdue: metrics.topOverdueTasks,
            bottleneck_statuses: metrics.statusDurations.slice(0, 5),
            workload_extremes: {
                most_loaded: Object.values(metrics.byAssignee)
                    .sort((a, b) => b.totalLoad - a.totalLoad)
                    .slice(0, 5),
                least_loaded: Object.values(metrics.byAssignee)
                    .sort((a, b) => a.totalLoad - b.totalLoad)
                    .slice(0, 5)
            }
        },
        comparisons: metrics.comparison || null,
        caveats: metrics.caveats
    };
}

/**
 * Generate narrative using Gemini Flash 2.0
 */
export async function generateNarrative(
    factsPacket: FactsPacket
): Promise<GeminiNarrative> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.warn('GEMINI_API_KEY not set. Returning stub narrative.');
        return generateStubNarrative(factsPacket);
    }

    const prompt = buildGeminiPrompt(factsPacket);

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 2048,
                    responseMimeType: 'application/json'
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textContent) {
            throw new Error('No content in Gemini response');
        }

        const narrative = JSON.parse(textContent) as GeminiNarrative;

        // Validate narrative structure
        validateNarrative(narrative, factsPacket);

        return narrative;

    } catch (error) {
        console.error('Gemini generation failed:', error);
        return generateStubNarrative(factsPacket);
    }
}

/**
 * Build structured prompt for Gemini
 */
function buildGeminiPrompt(facts: FactsPacket): string {
    const { report_meta, computed_metrics, key_lists, comparisons, caveats } = facts;

    return `You are a Senior Project Manager analyzing project performance data. Generate a professional status report narrative based ONLY on the provided metrics.

REPORT TYPE: ${report_meta.type.toUpperCase()}
DATE RANGE: ${report_meta.start_date} to ${report_meta.end_date}
TIMEZONE: ${report_meta.timezone}

KEY METRICS:
- Tasks Completed: ${computed_metrics.tasksCompleted}
- Tasks Created: ${computed_metrics.tasksCreated}
- Open Tasks: ${computed_metrics.openTaskCount}
- Avg Cycle Time: ${computed_metrics.avgCycleTimeDays} days
- Avg Lead Time: ${computed_metrics.avgLeadTimeDays} days
- Overdue Tasks: ${computed_metrics.overdueCount}
- On Hold Tasks: ${computed_metrics.onHoldCount} (${computed_metrics.onHoldTotalDays} total days)

TOP AGING TASKS (${key_lists.top_aging.length}):
${key_lists.top_aging.map(t => `- ${t.title} (${t.projectName}): ${t.daysOpen} days open${t.isOverdue ? ' - OVERDUE' : ''}`).join('\n')}

BOTTLENECK STATUSES:
${key_lists.bottleneck_statuses.map(s => `- ${s.status}: ${s.totalDays} total days, ${s.avgDays} avg days`).join('\n')}

WORKLOAD DISTRIBUTION:
Most Loaded: ${key_lists.workload_extremes.most_loaded.map(w => `${w.name} (${w.totalLoad} tasks)`).join(', ')}
Least Loaded: ${key_lists.workload_extremes.least_loaded.map(w => `${w.name} (${w.totalLoad} tasks)`).join(', ')}

${comparisons ? `
COMPARISON TO PRIOR PERIOD:
- Throughput: ${comparisons.throughputDelta > 0 ? '+' : ''}${comparisons.throughputDelta} (${comparisons.throughputDeltaPct}%)
- Cycle Time: ${comparisons.cycleTimeDelta > 0 ? '+' : ''}${comparisons.cycleTimeDelta} days (${comparisons.cycleTimeDeltaPct}%)
- Overdue: ${comparisons.overdueDelta > 0 ? '+' : ''}${comparisons.overdueDelta}
` : ''}

${caveats.length > 0 ? `DATA CAVEATS:\n${caveats.map(c => `- ${c}`).join('\n')}` : ''}

OUTPUT FORMAT (STRICT JSON):
{
  "executive_summary": ["2-3 crisp sentences summarizing overall performance"],
  "insights": ["Key insight 1 with specific numbers", "Key insight 2", "Key insight 3"],
  "risks": ["Risk 1 based on metrics", "Risk 2"],
  "recommendations": ["Actionable recommendation 1", "Actionable recommendation 2"],
  "outlook": ["What to expect next period based on current trends"],
  "confidence_notes": ["Any limitations or data quality notes"]
}

RULES:
1. Use ONLY numbers from the metrics provided above
2. Be professional, neutral, and constructive
3. Cite specific metrics (e.g., "Cycle time increased by X days...")
4. Highlight concerning trends (aging tasks, overdue items, bottlenecks)
5. Keep each point concise (1-2 sentences max)
6. Do NOT hallucinate or invent data
7. If data is limited, note it in confidence_notes

Generate the narrative now:`;
}

/**
 * Validate Gemini output
 */
function validateNarrative(narrative: GeminiNarrative, facts: FactsPacket): void {
    const required = ['executive_summary', 'insights', 'risks', 'recommendations', 'outlook', 'confidence_notes'];

    for (const field of required) {
        if (!narrative[field as keyof GeminiNarrative]) {
            throw new Error(`Missing required field: ${field}`);
        }

        if (!Array.isArray(narrative[field as keyof GeminiNarrative])) {
            throw new Error(`Field ${field} must be an array`);
        }
    }

    // Check for reasonable lengths
    if (narrative.executive_summary.length === 0) {
        throw new Error('Executive summary cannot be empty');
    }

    if (narrative.insights.length === 0) {
        throw new Error('Insights cannot be empty');
    }
}

/**
 * Generate stub narrative when Gemini is unavailable
 */
function generateStubNarrative(facts: FactsPacket): GeminiNarrative {
    const { computed_metrics } = facts;

    return {
        executive_summary: [
            `During the period ${facts.report_meta.start_date} to ${facts.report_meta.end_date}, the team completed ${computed_metrics.tasksCompleted} tasks with an average cycle time of ${computed_metrics.avgCycleTimeDays} days.`,
            `Currently ${computed_metrics.openTaskCount} tasks remain open, with ${computed_metrics.overdueCount} overdue items requiring attention.`
        ],
        insights: [
            `Throughput: ${computed_metrics.tasksCompleted} tasks completed`,
            `Cycle time: ${computed_metrics.avgCycleTimeDays} days average`,
            `${computed_metrics.overdueCount} tasks are overdue`,
            `${computed_metrics.onHoldCount} tasks currently on hold`
        ],
        risks: [
            computed_metrics.overdueCount > 0
                ? `${computed_metrics.overdueCount} overdue tasks may impact delivery commitments`
                : 'No significant delivery risks identified',
            computed_metrics.onHoldCount > 0
                ? `${computed_metrics.onHoldCount} tasks on hold for ${computed_metrics.onHoldTotalDays} total days`
                : 'No blocked work identified'
        ],
        recommendations: [
            'Review aging tasks and prioritize completion',
            'Address overdue items to prevent further delays',
            'Monitor workload distribution for balance'
        ],
        outlook: [
            `Based on current throughput, expect similar completion rates next period`,
            `Monitor aging tasks to prevent future overdue items`
        ],
        confidence_notes: [
            'AI narrative generation unavailable - using template summary',
            ...facts.caveats
        ]
    };
}
