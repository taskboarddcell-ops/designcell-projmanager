import {
    ReportMetrics,
    Task,
    TaskStatusLog,
    TaskSummary,
    StatusDuration,
    AssigneeWorkload,
    ThroughputDataPoint,
    AgingBucket,
    ComparisonMetrics,
    Profile
} from './types';

/**
 * Compute comprehensive metrics from raw data
 */
export function computeMetrics(
    tasks: Task[],
    logs: TaskStatusLog[],
    profiles: Profile[],
    startDate: string,
    endDate: string,
    timezone: string = 'UTC'
): ReportMetrics {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Helper functions
    const isInRange = (date: Date) => date >= start && date <= end;
    const diffDays = (d1: Date, d2: Date) => Math.floor((d1.getTime() - d2.getTime()) / (1000 * 3600 * 24));

    // Filter tasks
    const completedInPeriod = tasks.filter(t =>
        t.completed_at && isInRange(new Date(t.completed_at))
    );

    const createdInPeriod = tasks.filter(t =>
        t.created_at && isInRange(new Date(t.created_at))
    );

    // ONLY truly open tasks (not completed at all)
    // Check both completed_at AND status to handle edge cases
    const openTasks = tasks.filter(t =>
        !t.completed_at && t.status !== 'Complete' && t.status !== 'Completed'
    );

    // Cycle Time Calculation (with status log support)
    const cycleTimes: number[] = [];
    const leadTimes: number[] = [];

    completedInPeriod.forEach(t => {
        const taskLogs = logs.filter(l => l.task_id === t.id).sort((a, b) =>
            new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
        );

        // Lead time: created → completed
        if (t.created_at && t.completed_at) {
            const lead = diffDays(new Date(t.completed_at), new Date(t.created_at));
            if (lead >= 0) leadTimes.push(lead);
        }

        // Cycle time: first "In Progress" → completed
        const startLog = taskLogs.find(l =>
            l.to_status === 'In Progress' || l.to_status === 'Active'
        );

        if (startLog && t.completed_at) {
            const cycle = diffDays(new Date(t.completed_at), new Date(startLog.changed_at));
            if (cycle >= 0) cycleTimes.push(cycle);
        } else if (t.created_at && t.completed_at) {
            // Fallback to lead time
            const cycle = diffDays(new Date(t.completed_at), new Date(t.created_at));
            if (cycle >= 0) cycleTimes.push(cycle);
        }
    });

    const avgCycleTimeDays = cycleTimes.length > 0
        ? Math.round((cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length) * 10) / 10
        : 0;

    const avgLeadTimeDays = leadTimes.length > 0
        ? Math.round((leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length) * 10) / 10
        : 0;

    const medianCycleTimeDays = cycleTimes.length > 0
        ? cycleTimes.sort((a, b) => a - b)[Math.floor(cycleTimes.length / 2)]
        : 0;

    // Helper to get staff names from IDs
    const getStaffNames = (staffIds: string[]): string[] => {
        return staffIds.map(id => {
            const profile = profiles.find(p => p.staff_id === id);
            return profile?.name || id;
        });
    };

    // Aging Analysis (ONLY open tasks)
    const agingTasks = openTasks.map(t => ({
        ...t,
        daysOpen: diffDays(now, new Date(t.created_at || now.toISOString()))
    }));

    const topAgingTasks: TaskSummary[] = agingTasks
        .sort((a, b) => b.daysOpen - a.daysOpen)
        .slice(0, 10)
        .map(t => ({
            id: t.id,
            title: t.task,
            projectName: t.project_name,
            status: t.status,
            assignees: getStaffNames(t.assignee_ids || []),
            daysOpen: t.daysOpen,
            isOverdue: t.due ? new Date(t.due) < now : false,
            priority: t.priority || 'Medium'
        }));

    // Overdue Tasks (ONLY open tasks)
    const overdueTasks = openTasks.filter(t => t.due && new Date(t.due) < now);
    const topOverdueTasks: TaskSummary[] = overdueTasks
        .map(t => ({
            id: t.id,
            title: t.task,
            projectName: t.project_name,
            status: t.status,
            assignees: getStaffNames(t.assignee_ids || []),
            daysOpen: diffDays(now, new Date(t.created_at || now.toISOString())),
            isOverdue: true,
            priority: t.priority || 'Medium'
        }))
        .slice(0, 10);

    // On Hold Analysis
    const onHoldTasks = openTasks.filter(t => t.status === 'On Hold');
    let onHoldTotalDays = 0;

    tasks.forEach(t => {
        const taskLogs = logs.filter(l => l.task_id === t.id).sort((a, b) =>
            new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
        );

        let holdStart: Date | null = null;
        taskLogs.forEach(log => {
            if (log.to_status === 'On Hold' && !holdStart) {
                holdStart = new Date(log.changed_at);
            } else if (holdStart && log.from_status === 'On Hold') {
                onHoldTotalDays += diffDays(new Date(log.changed_at), holdStart);
                holdStart = null;
            }
        });

        // If still on hold
        if (holdStart && t.status === 'On Hold') {
            onHoldTotalDays += diffDays(now, holdStart);
        }
    });

    // Status Durations (Bottleneck Analysis)
    const statusDurationMap: Record<string, { totalDays: number; count: number }> = {};

    tasks.forEach(t => {
        const taskLogs = logs.filter(l => l.task_id === t.id).sort((a, b) =>
            new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
        );

        for (let i = 0; i < taskLogs.length - 1; i++) {
            const current = taskLogs[i];
            const next = taskLogs[i + 1];
            const duration = diffDays(new Date(next.changed_at), new Date(current.changed_at));

            if (!statusDurationMap[current.to_status]) {
                statusDurationMap[current.to_status] = { totalDays: 0, count: 0 };
            }
            statusDurationMap[current.to_status].totalDays += duration;
            statusDurationMap[current.to_status].count++;
        }
    });

    const statusDurations: StatusDuration[] = Object.entries(statusDurationMap)
        .map(([status, data]) => ({
            status,
            totalDays: data.totalDays,
            taskCount: data.count,
            avgDays: Math.round((data.totalDays / data.count) * 10) / 10
        }))
        .sort((a, b) => b.totalDays - a.totalDays);



    // Aggregations
    const byStatus: Record<string, number> = {};
    const byProject: Record<string, { completed: number; open: number; overdue: number }> = {};
    const byAssignee: Record<string, AssigneeWorkload> = {};

    tasks.forEach(t => {
        // Status
        const status = t.status || 'Unknown';
        byStatus[status] = (byStatus[status] || 0) + 1;

        // Project
        const projectName = t.project_name || 'Unassigned';
        if (!byProject[projectName]) {
            byProject[projectName] = { completed: 0, open: 0, overdue: 0 };
        }
        if (t.completed_at) {
            byProject[projectName].completed++;
        } else {
            byProject[projectName].open++;
            if (t.due && new Date(t.due) < now) {
                byProject[projectName].overdue++;
            }
        }

        // Assignee
        const assignees = t.assignee_ids || [];
        assignees.forEach(staffId => {
            const profile = profiles.find(p => p.staff_id === staffId);
            const name = profile?.name || staffId;

            if (!byAssignee[staffId]) {
                byAssignee[staffId] = {
                    staffId,
                    name,
                    completed: 0,
                    open: 0,
                    overdue: 0,
                    totalLoad: 0,
                    avgCycleTimeDays: 0
                };
            }

            if (t.completed_at) {
                byAssignee[staffId].completed++;
            } else {
                byAssignee[staffId].open++;
                byAssignee[staffId].totalLoad++;
                if (t.due && new Date(t.due) < now) {
                    byAssignee[staffId].overdue++;
                }
            }
        });
    });

    // Throughput Time Series
    const throughputMap: Record<string, number> = {};
    completedInPeriod.forEach(t => {
        if (t.completed_at) {
            const date = t.completed_at.split('T')[0];
            throughputMap[date] = (throughputMap[date] || 0) + 1;
        }
    });

    const throughputTimeSeries: ThroughputDataPoint[] = Object.entries(throughputMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

    // Aging Buckets
    const agingBuckets: AgingBucket[] = [
        { label: '0-7 days', minDays: 0, maxDays: 7, count: 0 },
        { label: '8-14 days', minDays: 8, maxDays: 14, count: 0 },
        { label: '15-30 days', minDays: 15, maxDays: 30, count: 0 },
        { label: '31-60 days', minDays: 31, maxDays: 60, count: 0 },
        { label: '60+ days', minDays: 61, maxDays: Infinity, count: 0 },
    ];

    agingTasks.forEach(t => {
        const bucket = agingBuckets.find(b => t.daysOpen >= b.minDays && t.daysOpen <= b.maxDays);
        if (bucket) bucket.count++;
    });

    // Data fingerprint
    const dataFingerprint = `${tasks.length}-${logs.length}-${now.toISOString()}`;

    // Caveats
    const caveats: string[] = [];
    if (logs.length === 0) {
        caveats.push('No status change logs available. Cycle time calculated from creation to completion.');
    }
    if (tasks.some(t => !t.created_at)) {
        caveats.push('Some tasks missing creation timestamps.');
    }

    return {
        generatedAt: now.toISOString(),
        dateRange: { start: startDate, end: endDate },
        timezone,
        tasksCompleted: completedInPeriod.length,
        tasksCreated: createdInPeriod.length,
        openTaskCount: openTasks.length,
        avgCycleTimeDays,
        avgLeadTimeDays,
        medianCycleTimeDays,
        overdueCount: overdueTasks.length,
        onHoldCount: onHoldTasks.length,
        onHoldTotalDays,
        topAgingTasks,
        topOverdueTasks,
        recentCompletions: completedInPeriod.slice(0, 10).map(t => ({
            id: t.id,
            title: t.task,
            projectName: t.project_name,
            status: t.status,
            assignees: getStaffNames(t.assignee_ids || []),
            daysOpen: 0,
            isOverdue: false,
            priority: t.priority || 'Medium'
        })),
        byStatus,
        byProject,
        byAssignee,
        statusDurations,
        throughputTimeSeries,
        agingBuckets,
        dataFingerprint,
        caveats
    };
}

/**
 * Compute comparison metrics against prior period
 */
export function computeComparison(
    currentMetrics: ReportMetrics,
    priorMetrics: ReportMetrics
): ComparisonMetrics {
    const throughputDelta = currentMetrics.tasksCompleted - priorMetrics.tasksCompleted;
    const throughputDeltaPct = priorMetrics.tasksCompleted > 0
        ? Math.round((throughputDelta / priorMetrics.tasksCompleted) * 100)
        : 0;

    const cycleTimeDelta = currentMetrics.avgCycleTimeDays - priorMetrics.avgCycleTimeDays;
    const cycleTimeDeltaPct = priorMetrics.avgCycleTimeDays > 0
        ? Math.round((cycleTimeDelta / priorMetrics.avgCycleTimeDays) * 100)
        : 0;

    const overdueDelta = currentMetrics.overdueCount - priorMetrics.overdueCount;

    return {
        throughputDelta,
        throughputDeltaPct,
        cycleTimeDelta,
        cycleTimeDeltaPct,
        overdueDelta
    };
}
