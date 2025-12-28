import { FullReportData, ChartData } from './types';

/**
 * Render comprehensive firm-wide report
 */
export function renderFirmWideReport(data: FullReportData): string {
  const { meta, metrics, narrative } = data;
  const chartData = prepareChartData(metrics);

  // Group tasks by project
  const projectSections = Object.entries(metrics.byProject).map(([projectName, stats]) => {
    const projectTasks = [...metrics.topAgingTasks, ...metrics.topOverdueTasks, ...metrics.recentCompletions]
      .filter(t => t.projectName === projectName);

    return { projectName, stats, tasks: projectTasks };
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Firm-Wide Report - ${meta.startDate} to ${meta.endDate}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #1a1a1a;
      line-height: 1.6;
      background: #ffffff;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    
    /* Header */
    .report-header {
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      color: white;
      padding: 40px;
      border-radius: 12px;
      margin-bottom: 40px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .report-title {
      font-size: 42px;
      font-weight: 800;
      margin-bottom: 12px;
      letter-spacing: -0.5px;
    }
    
    .report-subtitle {
      font-size: 18px;
      opacity: 0.95;
      font-weight: 400;
    }
    
    .report-meta {
      display: flex;
      justify-content: space-between;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid rgba(255,255,255,0.2);
      font-size: 14px;
    }
    
    /* Executive Summary */
    .executive-summary {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border-left: 6px solid #2563eb;
      padding: 32px;
      border-radius: 8px;
      margin-bottom: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    
    .executive-summary h2 {
      font-size: 24px;
      color: #1e3a8a;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .executive-summary p {
      font-size: 17px;
      line-height: 1.8;
      color: #334155;
      margin-bottom: 14px;
    }
    
    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 24px;
      margin-bottom: 48px;
    }
    
    .kpi-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      transition: transform 0.2s, box-shadow 0.2s;
      position: relative;
      overflow: hidden;
    }
    
    .kpi-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #3b82f6, #8b5cf6);
    }
    
    .kpi-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0,0,0,0.12);
    }
    
    .kpi-value {
      font-size: 48px;
      font-weight: 800;
      color: #1e3a8a;
      margin-bottom: 8px;
      line-height: 1;
    }
    
    .kpi-value.warning { color: #f59e0b; }
    .kpi-value.danger { color: #dc2626; }
    .kpi-value.success { color: #10b981; }
    
    .kpi-label {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      font-weight: 700;
    }
    
    .kpi-delta {
      font-size: 13px;
      margin-top: 8px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 12px;
      display: inline-block;
    }
    
    .kpi-delta.positive { background: #dcfce7; color: #166534; }
    .kpi-delta.negative { background: #fee2e2; color: #991b1b; }
    
    /* Section Headers */
    .section-header {
      font-size: 28px;
      font-weight: 800;
      color: #1e3a8a;
      margin: 48px 0 24px 0;
      padding-bottom: 16px;
      border-bottom: 3px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    /* Charts */
    .charts-section {
      margin-bottom: 48px;
    }
    
    .chart-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
      gap: 32px;
      margin-bottom: 32px;
    }
    
    .chart-container {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      position: relative;
    }
    
    .chart-title {
      font-size: 18px;
      font-weight: 700;
      color: #1e3a8a;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .chart-canvas {
      position: relative;
      height: 280px !important;
      max-height: 280px !important;
      width: 100% !important;
    }
    
    .chart-wrapper {
      position: relative;
      height: 280px;
      width: 100%;
    }
    
    /* Insights Grid */
    .insights-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 28px;
      margin-bottom: 48px;
    }
    
    .insight-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 28px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    
    .insight-card h3 {
      font-size: 20px;
      color: #1e3a8a;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 700;
    }
    
    .insight-card ul {
      list-style: none;
      padding: 0;
    }
    
    .insight-card li {
      padding: 12px 0 12px 32px;
      position: relative;
      color: #334155;
      line-height: 1.7;
      border-bottom: 1px solid #f1f5f9;
    }
    
    .insight-card li:last-child {
      border-bottom: none;
    }
    
    .insight-card li:before {
      content: "→";
      position: absolute;
      left: 8px;
      color: #3b82f6;
      font-weight: bold;
      font-size: 18px;
    }
    
    /* Project Sections */
    .project-section {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 32px;
      margin-bottom: 32px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    
    .project-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .project-name {
      font-size: 24px;
      font-weight: 700;
      color: #1e3a8a;
    }
    
    .project-stats {
      display: flex;
      gap: 24px;
    }
    
    .project-stat {
      text-align: center;
    }
    
    .project-stat-value {
      font-size: 28px;
      font-weight: 800;
      color: #1e3a8a;
    }
    
    .project-stat-label {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 4px;
    }
    
    /* Tables */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 32px;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .data-table thead {
      background: #f8fafc;
    }
    
    .data-table th {
      padding: 14px 16px;
      text-align: left;
      font-size: 13px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .data-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
      font-size: 14px;
    }
    
    .data-table tr:hover {
      background: #f8fafc;
    }
    
    .status-badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 700;
      text-transform: capitalize;
    }
    
    .status-complete { background: #dcfce7; color: #166534; }
    .status-progress { background: #dbeafe; color: #1e40af; }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-hold { background: #fee2e2; color: #991b1b; }
    
    .priority-high { color: #dc2626; font-weight: 800; }
    .priority-medium { color: #f59e0b; font-weight: 700; }
    .priority-low { color: #64748b; }
    
    .overdue-flag {
      background: #dc2626;
      color: white;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 800;
      margin-left: 8px;
    }
    
    .assignee-chip {
      display: inline-block;
      background: #e0f2fe;
      color: #0369a1;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-right: 6px;
      margin-bottom: 4px;
    }
    
    /* Print Styles */
    @media print {
      body { background: white; }
      .container { max-width: 100%; padding: 10px; }
      
      /* Compact spacing for print */
      .report-header { 
        padding: 20px; 
        margin-bottom: 15px;
        page-break-after: avoid;
      }
      .report-title { font-size: 28px; }
      .report-subtitle { font-size: 14px; }
      .report-meta { font-size: 11px; margin-top: 12px; padding-top: 12px; }
      
      .executive-summary { 
        padding: 16px; 
        margin-bottom: 15px;
        page-break-inside: avoid;
      }
      .executive-summary h2 { font-size: 18px; margin-bottom: 10px; }
      .executive-summary p { font-size: 13px; line-height: 1.5; margin-bottom: 8px; }
      
      /* Compact KPI grid */
      .kpi-grid { 
        gap: 12px; 
        margin-bottom: 20px;
        page-break-inside: avoid;
      }
      .kpi-card { 
        padding: 12px; 
        box-shadow: none;
        border: 1px solid #e2e8f0;
      }
      .kpi-value { font-size: 32px; }
      .kpi-label { font-size: 11px; }
      .kpi-delta { font-size: 10px; padding: 2px 8px; }
      
      /* Hide charts in PDF - they don't print well */
      .charts-section { 
        display: none !important; 
      }
      
      .section-header { 
        font-size: 20px; 
        margin: 20px 0 12px 0; 
        padding-bottom: 8px;
        page-break-after: avoid;
      }
      
      /* Compact insights */
      .insights-grid { 
        gap: 12px; 
        margin-bottom: 20px;
        grid-template-columns: 1fr 1fr;
      }
      .insight-card { 
        padding: 12px; 
        box-shadow: none;
        border: 1px solid #e2e8f0;
        page-break-inside: avoid;
      }
      .insight-card h3 { font-size: 14px; margin-bottom: 8px; }
      .insight-card li { 
        padding: 6px 0 6px 20px; 
        font-size: 11px;
        line-height: 1.4;
      }
      .insight-card li:before { font-size: 14px; left: 4px; }
      
      /* Compact project sections */
      .project-section { 
        padding: 12px; 
        margin-bottom: 12px;
        box-shadow: none;
        border: 1px solid #e2e8f0;
        page-break-inside: avoid;
      }
      .project-header { margin-bottom: 8px; padding-bottom: 8px; }
      .project-name { font-size: 16px; }
      .project-stat-value { font-size: 20px; }
      .project-stat-label { font-size: 10px; }
      
      /* Compact tables */
      .data-table { 
        font-size: 10px;
        margin-bottom: 15px;
        page-break-inside: auto;
      }
      .data-table th { 
        padding: 6px 8px; 
        font-size: 9px;
        background: #f8fafc !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .data-table td { 
        padding: 6px 8px;
        font-size: 10px;
      }
      .data-table tr {
        page-break-inside: avoid;
      }
      
      /* Limit table rows in PDF */
      .data-table tbody tr:nth-child(n+6) {
        display: none;
      }
      
      .status-badge { 
        padding: 2px 8px; 
        font-size: 9px;
      }
      .assignee-chip { 
        padding: 2px 6px; 
        font-size: 9px;
        margin-right: 3px;
      }
      .overdue-flag { 
        padding: 2px 6px; 
        font-size: 9px;
      }
      
      /* Force page breaks */
      .page-break { 
        page-break-before: always; 
      }
      
      /* Ensure colors print */
      * {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
    
    @page {
      size: A4;
      margin: 12mm;
    }
  </style>
</head>
<body>
  <div class="container">
    
    <!-- Header -->
    <div class="report-header">
      <h1 class="report-title">📊 Firm-Wide Performance Report</h1>
      <p class="report-subtitle">Comprehensive analysis of all projects and team activities</p>
      <div class="report-meta">
        <div>
          <strong>Period:</strong> ${formatDate(meta.startDate)} - ${formatDate(meta.endDate)}
        </div>
        <div>
          <strong>Generated:</strong> ${formatDateTime(metrics.generatedAt)}
        </div>
        <div>
          <strong>Timezone:</strong> ${metrics.timezone}
        </div>
      </div>
    </div>
    
    <!-- Executive Summary -->
    <div class="executive-summary">
      <h2>📋 Executive Summary</h2>
      ${narrative.executive_summary.map(p => `<p>${escapeHtml(p)}</p>`).join('')}
    </div>
    
    <!-- KPI Grid -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-value success">${metrics.tasksCompleted}</div>
        <div class="kpi-label">Tasks Completed</div>
        ${metrics.comparison ? `<div class="kpi-delta ${metrics.comparison.throughputDelta >= 0 ? 'positive' : 'negative'}">${metrics.comparison.throughputDelta >= 0 ? '+' : ''}${metrics.comparison.throughputDelta} vs prior period</div>` : ''}
      </div>
      
      <div class="kpi-card">
        <div class="kpi-value">${metrics.tasksCreated}</div>
        <div class="kpi-label">New Tasks Created</div>
      </div>
      
      <div class="kpi-card">
        <div class="kpi-value">${metrics.avgCycleTimeDays} days</div>
        <div class="kpi-label">Avg Cycle Time</div>
        ${metrics.comparison ? `<div class="kpi-delta ${metrics.comparison.cycleTimeDelta <= 0 ? 'positive' : 'negative'}">${metrics.comparison.cycleTimeDelta >= 0 ? '+' : ''}${metrics.comparison.cycleTimeDelta}d vs prior</div>` : ''}
      </div>
      
      <div class="kpi-card">
        <div class="kpi-value ${metrics.overdueCount > 0 ? 'danger' : ''}">${metrics.overdueCount}</div>
        <div class="kpi-label">Overdue Tasks</div>
        ${metrics.comparison ? `<div class="kpi-delta ${metrics.comparison.overdueDelta <= 0 ? 'positive' : 'negative'}">${metrics.comparison.overdueDelta >= 0 ? '+' : ''}${metrics.comparison.overdueDelta}</div>` : ''}
      </div>
      
      <div class="kpi-card">
        <div class="kpi-value ${metrics.onHoldCount > 0 ? 'warning' : ''}">${metrics.onHoldCount}</div>
        <div class="kpi-label">On Hold</div>
        <div style="font-size:12px;color:#64748b;margin-top:8px;">${metrics.onHoldTotalDays} total days blocked</div>
      </div>
      
      <div class="kpi-card">
        <div class="kpi-value">${metrics.openTaskCount}</div>
        <div class="kpi-label">Open Tasks</div>
      </div>
      
      <div class="kpi-card">
        <div class="kpi-value">${Object.keys(metrics.byProject).length}</div>
        <div class="kpi-label">Active Projects</div>
      </div>
      
      <div class="kpi-card">
        <div class="kpi-value">${Object.keys(metrics.byAssignee).length}</div>
        <div class="kpi-label">Team Members</div>
      </div>
    </div>
    
    <!-- Charts -->
    <h2 class="section-header">📈 Performance Metrics</h2>
    <div class="charts-section">
      <div class="chart-grid">
        <div class="chart-container">
          <div class="chart-title">📊 Status Distribution</div>
          <canvas id="statusChart" class="chart-canvas"></canvas>
        </div>
        
        <div class="chart-container">
          <div class="chart-title">⏰ Task Aging Analysis</div>
          <canvas id="agingChart" class="chart-canvas"></canvas>
        </div>
      </div>
      
      <div class="chart-grid">
        <div class="chart-container">
          <div class="chart-title">📉 Throughput Trend</div>
          <canvas id="throughputChart" class="chart-canvas"></canvas>
        </div>
        
        <div class="chart-container">
          <div class="chart-title">👥 Team Workload Distribution</div>
          <canvas id="workloadChart" class="chart-canvas"></canvas>
        </div>
      </div>
    </div>
    
    <!-- Insights Grid -->
    <h2 class="section-header">💡 Key Insights & Recommendations</h2>
    <div class="insights-grid">
      <div class="insight-card">
        <h3>💡 Key Insights</h3>
        <ul>
          ${narrative.insights.map(i => `<li>${escapeHtml(i)}</li>`).join('')}
        </ul>
      </div>
      
      <div class="insight-card">
        <h3>⚠️ Risks & Blockers</h3>
        <ul>
          ${narrative.risks.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
        </ul>
      </div>
      
      <div class="insight-card">
        <h3>✅ Recommendations</h3>
        <ul>
          ${narrative.recommendations.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
        </ul>
      </div>
      
      <div class="insight-card">
        <h3>🔮 Outlook</h3>
        <ul>
          ${narrative.outlook.map(o => `<li>${escapeHtml(o)}</li>`).join('')}
        </ul>
      </div>
    </div>
    
    <div class="page-break"></div>
    
    <!-- Project Breakdown -->
    <h2 class="section-header">🏗️ Project Breakdown</h2>
    ${projectSections.map(({ projectName, stats }) => `
      <div class="project-section">
        <div class="project-header">
          <div class="project-name">${escapeHtml(projectName)}</div>
          <div class="project-stats">
            <div class="project-stat">
              <div class="project-stat-value success">${stats.completed}</div>
              <div class="project-stat-label">Completed</div>
            </div>
            <div class="project-stat">
              <div class="project-stat-value">${stats.open}</div>
              <div class="project-stat-label">Open</div>
            </div>
            <div class="project-stat">
              <div class="project-stat-value ${stats.overdue > 0 ? 'danger' : ''}">${stats.overdue}</div>
              <div class="project-stat-label">Overdue</div>
            </div>
          </div>
        </div>
      </div>
    `).join('')}
    
    <!-- Top Aging Tasks -->
    <h2 class="section-header">⏰ Top Aging Tasks (Across All Projects)</h2>
    <table class="data-table">
      <thead>
        <tr>
          <th>Task</th>
          <th>Project</th>
          <th>Status</th>
          <th>Priority</th>
          <th>Days Open</th>
          <th>Assignees</th>
        </tr>
      </thead>
      <tbody>
        ${metrics.topAgingTasks.map(task => `
          <tr>
            <td>
              ${escapeHtml(task.title)}
              ${task.isOverdue ? '<span class="overdue-flag">OVERDUE</span>' : ''}
            </td>
            <td>${escapeHtml(task.projectName)}</td>
            <td><span class="status-badge status-${task.status.toLowerCase().replace(' ', '-')}">${escapeHtml(task.status)}</span></td>
            <td class="priority-${task.priority.toLowerCase()}">${escapeHtml(task.priority)}</td>
            <td><strong>${task.daysOpen}</strong></td>
            <td>${task.assignees.map(a => `<span class="assignee-chip">${escapeHtml(a)}</span>`).join('')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    ${metrics.topOverdueTasks.length > 0 ? `
    <!-- Overdue Tasks -->
    <h2 class="section-header">🚨 Overdue Tasks Requiring Immediate Attention</h2>
    <table class="data-table">
      <thead>
        <tr>
          <th>Task</th>
          <th>Project</th>
          <th>Status</th>
          <th>Priority</th>
          <th>Days Open</th>
          <th>Assignees</th>
        </tr>
      </thead>
      <tbody>
        ${metrics.topOverdueTasks.map(task => `
          <tr>
            <td>${escapeHtml(task.title)}</td>
            <td>${escapeHtml(task.projectName)}</td>
            <td><span class="status-badge status-${task.status.toLowerCase().replace(' ', '-')}">${escapeHtml(task.status)}</span></td>
            <td class="priority-${task.priority.toLowerCase()}">${escapeHtml(task.priority)}</td>
            <td><strong>${task.daysOpen}</strong></td>
            <td>${task.assignees.map(a => `<span class="assignee-chip">${escapeHtml(a)}</span>`).join('')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}
    
    <!-- Team Workload -->
    <h2 class="section-header">👥 Team Workload Analysis</h2>
    <table class="data-table">
      <thead>
        <tr>
          <th>Team Member</th>
          <th>Completed</th>
          <th>Open</th>
          <th>Overdue</th>
          <th>Total Load</th>
          <th>Avg Cycle Time</th>
        </tr>
      </thead>
      <tbody>
        ${Object.values(metrics.byAssignee)
      .sort((a, b) => b.totalLoad - a.totalLoad)
      .map(assignee => `
          <tr>
            <td><strong>${escapeHtml(assignee.name)}</strong></td>
            <td><span class="status-badge status-complete">${assignee.completed}</span></td>
            <td>${assignee.open}</td>
            <td class="${assignee.overdue > 0 ? 'priority-high' : ''}">${assignee.overdue}</td>
            <td><strong>${assignee.totalLoad}</strong></td>
            <td>${assignee.avgCycleTimeDays || 0} days</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    ${narrative.confidence_notes.length > 0 ? `
    <!-- Confidence Notes -->
    <div style="margin-top:48px;padding:20px;background:#fef3c7;border-left:6px solid #f59e0b;border-radius:8px;">
      <strong style="color:#92400e;font-size:16px;">ℹ️ Data Quality Notes:</strong>
      <ul style="margin:12px 0 0 24px;color:#78350f;">
        ${narrative.confidence_notes.map(note => `<li style="margin-bottom:8px;">${escapeHtml(note)}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
    
  </div>
  
  <script>
    const chartData = ${JSON.stringify(chartData)};
    
    // Common chart options
    const commonOptions = {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2,
      layout: {
        padding: 10
      }
    };
    
    // Status Distribution Chart
    new Chart(document.getElementById('statusChart'), {
      type: 'doughnut',
      data: {
        labels: chartData.statusDistribution.labels,
        datasets: [{
          data: chartData.statusDistribution.values,
          backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']
        }]
      },
      options: {
        ...commonOptions,
        aspectRatio: 1.5,
        plugins: {
          legend: { 
            position: 'bottom', 
            labels: { 
              padding: 12, 
              font: { size: 12 },
              boxWidth: 12
            } 
          }
        }
      }
    });
    
    // Aging Buckets Chart
    new Chart(document.getElementById('agingChart'), {
      type: 'bar',
      data: {
        labels: chartData.agingBuckets.labels,
        datasets: [{
          label: 'Tasks',
          data: chartData.agingBuckets.counts,
          backgroundColor: '#3b82f6',
          borderRadius: 4
        }]
      },
      options: {
        ...commonOptions,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { 
            beginAtZero: true, 
            grid: { color: '#f1f5f9' },
            ticks: { font: { size: 11 } }
          },
          x: { 
            grid: { display: false },
            ticks: { font: { size: 11 } }
          }
        }
      }
    });
    
    // Throughput Trend Chart
    new Chart(document.getElementById('throughputChart'), {
      type: 'line',
      data: {
        labels: chartData.throughputTrend.dates,
        datasets: [{
          label: 'Completed Tasks',
          data: chartData.throughputTrend.counts,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: true,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5
        }]
      },
      options: {
        ...commonOptions,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { 
            beginAtZero: true, 
            grid: { color: '#f1f5f9' },
            ticks: { font: { size: 11 } }
          },
          x: { 
            grid: { display: false },
            ticks: { 
              font: { size: 10 },
              maxRotation: 45,
              minRotation: 0
            }
          }
        }
      }
    });
    
    // Workload Chart
    new Chart(document.getElementById('workloadChart'), {
      type: 'bar',
      data: {
        labels: chartData.workloadByAssignee.labels,
        datasets: [
          {
            label: 'Completed',
            data: chartData.workloadByAssignee.completed,
            backgroundColor: '#10b981',
            borderRadius: 4
          },
          {
            label: 'Open',
            data: chartData.workloadByAssignee.open,
            backgroundColor: '#f59e0b',
            borderRadius: 4
          }
        ]
      },
      options: {
        ...commonOptions,
        plugins: {
          legend: { 
            position: 'bottom', 
            labels: { 
              padding: 12, 
              font: { size: 12 },
              boxWidth: 12
            } 
          }
        },
        scales: {
          x: { 
            stacked: true, 
            grid: { display: false },
            ticks: { 
              font: { size: 10 },
              maxRotation: 45,
              minRotation: 0
            }
          },
          y: { 
            stacked: true, 
            beginAtZero: true, 
            grid: { color: '#f1f5f9' },
            ticks: { font: { size: 11 } }
          }
        }
      }
    });
  </script>
</body>
</html>`;
}

/**
 * Prepare chart data from metrics
 */
function prepareChartData(metrics: any): ChartData {
  return {
    statusDistribution: {
      labels: Object.keys(metrics.byStatus),
      values: Object.values(metrics.byStatus) as number[]
    },
    throughputTrend: {
      dates: metrics.throughputTimeSeries.map((d: any) => d.date),
      counts: metrics.throughputTimeSeries.map((d: any) => d.count)
    },
    agingBuckets: {
      labels: metrics.agingBuckets.map((b: any) => b.label),
      counts: metrics.agingBuckets.map((b: any) => b.count)
    },
    workloadByAssignee: {
      labels: Object.keys(metrics.byAssignee).slice(0, 10),
      completed: Object.keys(metrics.byAssignee).slice(0, 10).map(k => metrics.byAssignee[k].completed),
      open: Object.keys(metrics.byAssignee).slice(0, 10).map(k => metrics.byAssignee[k].open)
    }
  };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Main render function - routes to appropriate template
 */
export function renderHtml(data: FullReportData): string {
  if (data.meta.reportType === 'firm') {
    return renderFirmWideReport(data);
  }

  // For other report types, use the original template
  // (You can create separate templates for individual and project reports)
  return renderFirmWideReport(data);
}
