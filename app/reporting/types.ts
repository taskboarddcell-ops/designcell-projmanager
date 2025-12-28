// ============ REPORT REQUEST TYPES ============

export interface ReportRequest {
    reportType: 'individual' | 'project' | 'firm';
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    timezone?: string; // Default: 'UTC'

    // Filters
    projectIds?: string[];  // For project/firm reports
    staffId?: string;       // For individual reports

    // Output options
    output: 'html' | 'pdf';
    regenerate?: boolean;   // Force new generation even if cached
}

export interface ReportFilters {
    projectIds?: string[];
    staffId?: string;
    [key: string]: any;
}

// ============ TASK & DATA TYPES ============

export interface Task {
    id: string;
    project_id: string;
    project_name: string;
    task: string;
    description?: string;
    status: string;
    priority?: string;
    due?: string;
    created_at: string;
    completed_at?: string;
    assignee_ids?: string[];
    assignees?: string[];
    current_status?: string;
}

export interface TaskStatusLog {
    id: string;
    task_id: string;
    action: string;
    from_status?: string;
    to_status: string;
    note?: string;
    changed_at: string;
    changed_by_id?: string;
    changed_by_name?: string;
}

export interface Profile {
    staff_id: string;
    name: string;
    email?: string;
    level: string;
    is_active: boolean;
}

export interface Project {
    id: string;
    name: string;
    type: string;
    project_status?: string;
    lead_ids?: string[];
}

// ============ ANALYTICS TYPES ============

export interface TaskSummary {
    id: string;
    title: string;
    projectName: string;
    status: string;
    assignees: string[];
    daysOpen: number;
    isOverdue: boolean;
    priority: string;
}

export interface StatusDuration {
    status: string;
    totalDays: number;
    taskCount: number;
    avgDays: number;
}

export interface AssigneeWorkload {
    staffId: string;
    name: string;
    completed: number;
    open: number;
    overdue: number;
    totalLoad: number;
    avgCycleTimeDays: number;
}

export interface ThroughputDataPoint {
    date: string;
    count: number;
}

export interface AgingBucket {
    label: string;
    minDays: number;
    maxDays: number;
    count: number;
}

export interface ComparisonMetrics {
    throughputDelta: number;
    throughputDeltaPct: number;
    cycleTimeDelta: number;
    cycleTimeDeltaPct: number;
    overdueDelta: number;
}

export interface ReportMetrics {
    generatedAt: string;
    dateRange: { start: string; end: string };
    timezone: string;

    // Core KPIs
    tasksCompleted: number;
    tasksCreated: number;
    openTaskCount: number;

    // Timing
    avgCycleTimeDays: number;
    avgLeadTimeDays: number;
    medianCycleTimeDays: number;

    // Health
    overdueCount: number;
    onHoldCount: number;
    onHoldTotalDays: number;

    // Lists
    topAgingTasks: TaskSummary[];
    topOverdueTasks: TaskSummary[];
    recentCompletions: TaskSummary[];

    // Breakdowns
    byStatus: Record<string, number>;
    byProject: Record<string, { completed: number; open: number; overdue: number }>;
    byAssignee: Record<string, AssigneeWorkload>;

    // Bottlenecks
    statusDurations: StatusDuration[];

    // Time series
    throughputTimeSeries: ThroughputDataPoint[];
    agingBuckets: AgingBucket[];

    // Comparisons
    comparison?: ComparisonMetrics;

    // Metadata
    dataFingerprint: string;
    caveats: string[];
}

// ============ GEMINI NARRATIVE TYPES ============

export interface FactsPacket {
    report_meta: {
        type: string;
        start_date: string;
        end_date: string;
        timezone: string;
        filters: ReportFilters;
        generated_at: string;
    };
    computed_metrics: ReportMetrics;
    key_lists: {
        top_aging: TaskSummary[];
        top_overdue: TaskSummary[];
        bottleneck_statuses: StatusDuration[];
        workload_extremes: {
            most_loaded: AssigneeWorkload[];
            least_loaded: AssigneeWorkload[];
        };
    };
    comparisons: ComparisonMetrics | null;
    caveats: string[];
}

export interface GeminiNarrative {
    executive_summary: string[];
    insights: string[];
    risks: string[];
    recommendations: string[];
    outlook: string[];
    confidence_notes: string[];
}

// ============ CACHE TYPES ============

export interface ReportRun {
    id: string;
    report_type: 'individual' | 'project' | 'firm';
    start_date: string;
    end_date: string;
    timezone: string;
    filters_json: ReportFilters;

    schema_version: string;
    analytics_version: string;
    template_version: string;
    gemini_model_version: string;

    cache_key: string;
    data_fingerprint: string;
    prompt_fingerprint: string;

    status: 'generating' | 'generated' | 'failed';
    error_message?: string;

    created_at: string;
    created_by_id?: string;
    created_by_name?: string;
    generation_duration_ms?: number;
}

export interface ReportArtifact {
    id: string;
    report_run_id: string;
    html_content?: string;
    html_storage_path?: string;
    pdf_storage_path?: string;
    narrative_json: GeminiNarrative;
    metrics_json: ReportMetrics;
    charts_json?: any;
    checksum: string;
    created_at: string;
}

// ============ FULL REPORT DATA ============

export interface FullReportData {
    meta: ReportRequest;
    metrics: ReportMetrics;
    narrative: GeminiNarrative;
    factsPacket: FactsPacket;
}

// ============ CHART DATA ============

export interface ChartData {
    statusDistribution: {
        labels: string[];
        values: number[];
    };
    throughputTrend: {
        dates: string[];
        counts: number[];
    };
    agingBuckets: {
        labels: string[];
        counts: number[];
    };
    workloadByAssignee: {
        labels: string[];
        completed: number[];
        open: number[];
    };
    onHoldTrend?: {
        dates: string[];
        counts: number[];
    };
}
