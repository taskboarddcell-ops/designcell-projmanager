'use client';

import { useState, useEffect, useMemo } from 'react';

// --- Constants & Styles ---
const COLORS = {
    primary: '#2563eb',
    primaryHover: '#1d4ed8',
    secondary: '#4b5563',
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
    background: '#f8fafc',
    surface: '#ffffff',
    border: '#e2e8f0',
    text: '#0f172a',
    textSecondary: '#64748b',
    textTertiary: '#94a3b8'
};

const STYLES = {
    card: {
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    },
    label: {
        display: 'block',
        fontSize: '14px',
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: '6px'
    },
    input: {
        width: '100%',
        padding: '10px 12px',
        border: `1px solid ${COLORS.border}`,
        borderRadius: '6px',
        fontSize: '14px',
        outline: 'none',
        transition: 'border-color 0.2s',
        background: '#fff'
    },
    button: {
        padding: '10px 16px',
        borderRadius: '8px',
        border: 'none',
        fontWeight: '600',
        cursor: 'pointer',
        fontSize: '14px',
        transition: 'all 0.2s',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        justifyContent: 'center'
    },
    badge: {
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '600',
        textTransform: 'uppercase' as const
    }
};

interface Project {
    id: string;
    name: string;
    project_status: string;
}

interface User {
    staff_id: string;
    name: string;
}

interface ReportFormData {
    reportType: 'firm' | 'project' | 'individual';
    startDate: string;
    endDate: string;
    timezone: string;
    projectIds: string[];
    staffId: string;
    output: 'html' | 'pdf';
}

// --- Date Helpers ---
function getToday() {
    return new Date().toISOString().split('T')[0];
}

function getDateDaysAgo(days: number) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
}

// --- Component ---
export default function ReportsPage() {
    // State
    const [formData, setFormData] = useState<ReportFormData>({
        reportType: 'firm',
        startDate: getDateDaysAgo(30),
        endDate: getToday(),
        timezone: 'Asia/Kathmandu',
        projectIds: [],
        staffId: '',
        output: 'html'
    });

    const [loading, setLoading] = useState(false);
    const [generatingStage, setGeneratingStage] = useState('');
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [history, setHistory] = useState<any[]>([]);

    // UI State
    const [reportHtml, setReportHtml] = useState('');
    const [lastRun, setLastRun] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [showStaffSuggestions, setShowStaffSuggestions] = useState(false);

    // Initial Load
    useEffect(() => {
        loadProjects();
        loadUsers();
        loadHistory();
    }, []);

    // Filtered Projects for Multi-Select
    const filteredProjects = useMemo(() => {
        if (!searchTerm) return projects;
        const lower = searchTerm.toLowerCase();
        return projects.filter(p => p.name.toLowerCase().includes(lower));
    }, [projects, searchTerm]);

    // --- Data Loading ---
    async function loadProjects() {
        try {
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            const { data } = await supabase
                .from('projects')
                .select('id, name, project_status')
                .eq('project_status', 'Ongoing') // Default to active projects
                .order('name');

            setProjects(data || []);
        } catch (err) {
            console.error('Failed to load projects:', err);
        }
    }

    async function loadUsers() {
        try {
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            const { data } = await supabase
                .from('users')
                .select('staff_id, name')
                .eq('status', 'active')
                .order('name');

            setUsers(data || []);
            setFilteredUsers(data || []);
        } catch (err) {
            console.error('Failed to load users:', err);
        }
    }

    async function loadHistory() {
        try {
            const res = await fetch('/api/reports/history?limit=10');
            const data = await res.json();
            setHistory(data.reports || []);
        } catch (err) {
            console.error('Failed to load history:', err);
        }
    }

    // --- Actions ---
    function applyPreset(days: number) {
        setFormData(prev => ({
            ...prev,
            startDate: getDateDaysAgo(days),
            endDate: getToday()
        }));
    }

    function toggleProject(projectId: string) {
        setFormData(prev => {
            const current = prev.projectIds;
            if (current.includes(projectId)) {
                return { ...prev, projectIds: current.filter(id => id !== projectId) };
            } else {
                return { ...prev, projectIds: [...current, projectId] };
            }
        });
    }

    async function handleGeneratePreview() {
        setLoading(true);
        setGeneratingStage('Fetching data...');
        setReportHtml('');
        setLastRun(null);

        try {
            // Simulated progress steps
            setTimeout(() => setGeneratingStage('Computing metrics...'), 1000);
            setTimeout(() => setGeneratingStage('Generating AI insights...'), 2500);

            const res = await fetch('/api/reports/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, output: 'html' })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Generation failed');
            }

            const data = await res.json();
            setReportHtml(data.html);
            setLastRun({
                runId: data.reportRunId,
                fromCache: data.fromCache,
                timestamp: new Date().toISOString()
            });

            loadHistory();

        } catch (err: any) {
            console.error(err);
            alert('Failed to generate: ' + err.message);
        } finally {
            setLoading(false);
            setGeneratingStage('');
        }
    }

    async function downloadPDF(runId?: string) {
        // If history item, try direct open (assumes artifact exists)
        if (runId && (!lastRun || runId !== lastRun.runId)) {
            window.open(`/api/reports/${runId}?format=pdf`, '_blank');
            return;
        }

        // If current report, generate fresh PDF to ensure it matches current preview
        try {
            const res = await fetch('/api/reports/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, output: 'pdf' })
            });

            if (!res.ok) throw new Error('PDF generation failed');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `report-${formData.reportType}-${formData.startDate}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('PDF Error:', err);
            alert('Failed to generate PDF. Please try HTML preview.');
        }
    }

    async function viewReport(reportId: string) {
        try {
            const res = await fetch(`/api/reports/${reportId}?format=html`);
            if (!res.ok) throw new Error('Failed to load');
            const html = await res.text();
            setReportHtml(html);
            // Also fetch metadata to show "Cached" status logic?
            // For now just show preview
        } catch (err) {
            console.error(err);
            alert('Failed to load report');
        }
    }

    // --- Render Helpers ---
    const isValid = useMemo(() => {
        if (!formData.startDate || !formData.endDate) return false;
        if (formData.startDate > formData.endDate) return false;
        if (formData.reportType === 'project' && formData.projectIds.length === 0) return false;
        if (formData.reportType === 'individual' && !formData.staffId) return false;
        return true;
    }, [formData]);

    return (
        <div style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto', background: '#f8fafc', minHeight: '100vh' }}>

            {/* Header */}
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '800', color: COLORS.text, marginBottom: '8px' }}>
                        📊 AI Reports
                    </h1>
                    <p style={{ color: COLORS.textSecondary }}>
                        Generate actionable insights from your project data
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 400px) 1fr', gap: '32px', alignItems: 'start' }}>

                {/* --- LEFT COLUMN: SETTINGS --- */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Configuration Card */}
                    <div style={{ ...STYLES.card, padding: '24px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            ⚙️ Configuration
                        </h2>

                        {/* Report Type */}
                        <div style={{ marginBottom: '24px' }}>
                            <label style={STYLES.label}>Report Scope</label>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                {[
                                    { id: 'firm', label: '🏢 Firm-Wide' },
                                    { id: 'project', label: '📁 Project' },
                                    { id: 'individual', label: '👤 Individual' }
                                ].map(type => (
                                    <button
                                        key={type.id}
                                        onClick={() => setFormData({ ...formData, reportType: type.id as any })}
                                        style={{
                                            ...STYLES.button,
                                            flex: 1,
                                            background: formData.reportType === type.id ? COLORS.primary : '#f1f5f9',
                                            color: formData.reportType === type.id ? 'white' : COLORS.text,
                                            fontSize: '13px'
                                        }}
                                    >
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Dynamic Fields */}
                        {formData.reportType === 'project' && (
                            <div style={{ marginBottom: '24px' }}>
                                <label style={STYLES.label}>Select Projects ({formData.projectIds.length})</label>
                                <input
                                    placeholder="Search projects..."
                                    style={{ ...STYLES.input, marginBottom: '8px' }}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <div style={{ maxHeight: '200px', overflowY: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '6px', background: '#fff' }}>
                                    {filteredProjects.map(p => (
                                        <div
                                            key={p.id}
                                            onClick={() => toggleProject(p.id)}
                                            style={{
                                                padding: '8px 12px',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid #f1f5f9',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                background: formData.projectIds.includes(p.id) ? '#eff6ff' : 'transparent',
                                                fontSize: '14px'
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={formData.projectIds.includes(p.id)}
                                                readOnly
                                            />
                                            {p.name}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {formData.reportType === 'individual' && (
                            <div style={{ marginBottom: '24px', position: 'relative' }}>
                                <label style={STYLES.label}>Staff Member</label>
                                <input
                                    style={STYLES.input}
                                    placeholder="Search by name or ID..."
                                    value={formData.staffId}
                                    onChange={(e) => {
                                        setFormData({ ...formData, staffId: e.target.value });
                                        const q = e.target.value.toLowerCase();
                                        setFilteredUsers(users.filter(u =>
                                            u.name.toLowerCase().includes(q) || u.staff_id.toLowerCase().includes(q)
                                        ));
                                        setShowStaffSuggestions(true);
                                    }}
                                    onFocus={() => setShowStaffSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowStaffSuggestions(false), 200)}
                                />
                                {showStaffSuggestions && filteredUsers.length > 0 && (
                                    <div style={{
                                        position: 'absolute', top: '100%', left: 0, right: 0,
                                        background: 'white', border: `1px solid ${COLORS.border}`,
                                        borderRadius: '6px', maxHeight: '200px', overflowY: 'auto', zIndex: 1000,
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                    }}>
                                        {filteredUsers.map(user => (
                                            <div
                                                key={user.staff_id}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    setFormData({ ...formData, staffId: user.staff_id });
                                                    setShowStaffSuggestions(false);
                                                }}
                                                style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                            >
                                                <div style={{ fontWeight: '600', fontSize: '14px' }}>{user.name}</div>
                                                <div style={{ fontSize: '12px', color: COLORS.textSecondary }}>{user.staff_id}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Date Range */}
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label style={{ ...STYLES.label, marginBottom: 0 }}>Date Range</label>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    {[7, 30, 90].map(days => (
                                        <button
                                            key={days}
                                            onClick={() => applyPreset(days)}
                                            style={{
                                                fontSize: '11px', padding: '2px 6px',
                                                border: `1px solid ${COLORS.border}`, borderRadius: '4px',
                                                background: 'white', cursor: 'pointer'
                                            }}
                                        >
                                            {days}d
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <input
                                    type="date"
                                    style={STYLES.input}
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                />
                                <input
                                    type="date"
                                    style={STYLES.input}
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Generate CTA */}
                        {lastRun && lastRun.fromCache && (
                            <div style={{ marginBottom: '12px', padding: '10px', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>⚡ Loaded from cache</span>
                            </div>
                        )}

                        <button
                            onClick={handleGeneratePreview}
                            disabled={loading || !isValid}
                            style={{
                                ...STYLES.button,
                                width: '100%',
                                background: loading || !isValid ? '#94a3b8' : COLORS.primary,
                                color: 'white',
                                padding: '14px',
                                fontSize: '15px'
                            }}
                        >
                            {loading ? (
                                <>⏳ {generatingStage || 'Generating...'}</>
                            ) : (
                                <>🚀 Generate & Preview</>
                            )}
                        </button>
                    </div>

                    {/* Recent History Card */}
                    <div style={{ ...STYLES.card, padding: '24px', flex: 1 }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>
                            🕒 Recent Reports
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {history.length === 0 && <div style={{ color: COLORS.textSecondary, fontStyle: 'italic' }}>No reports yet</div>}
                            {history.map(run => (
                                <div key={run.id} style={{ padding: '12px', borderRadius: '8px', background: '#f8fafc', border: `1px solid ${COLORS.border}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span style={{ fontWeight: '600', fontSize: '13px', textTransform: 'capitalize' }}>
                                            {run.report_type} Report
                                        </span>
                                        <span style={{ fontSize: '11px', color: COLORS.textSecondary }}>
                                            {run.start_date}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                        <button
                                            onClick={() => viewReport(run.id)}
                                            style={{ ...STYLES.button, padding: '4px 10px', fontSize: '11px', background: '#e2e8f0', color: COLORS.text }}
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={() => downloadPDF(run.id)}
                                            style={{ ...STYLES.button, padding: '4px 10px', fontSize: '11px', background: 'white', border: `1px solid ${COLORS.border}` }}
                                        >
                                            PDF
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- RIGHT COLUMN: PREVIEW --- */}
                <div>
                    {reportHtml ? (
                        <div style={{ ...STYLES.card, overflow: 'hidden', height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '16px', borderBottom: `1px solid ${COLORS.border}`, background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '14px', fontWeight: '600' }}>
                                    📄 Report Preview
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => downloadPDF()}
                                        style={{ ...STYLES.button, background: COLORS.danger, color: 'white', padding: '6px 12px', fontSize: '12px' }}
                                    >
                                        📑 Download PDF
                                    </button>
                                    <button
                                        onClick={() => setReportHtml('')}
                                        style={{ ...STYLES.button, background: 'white', border: `1px solid ${COLORS.border}`, padding: '6px 12px', fontSize: '12px' }}
                                    >
                                        ✕ Close
                                    </button>
                                </div>
                            </div>
                            <iframe
                                srcDoc={reportHtml}
                                style={{ flex: 1, border: 'none', background: 'white' }}
                                title="Report Preview"
                            />
                        </div>
                    ) : (
                        <div style={{
                            ...STYLES.card,
                            height: '600px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#fff',
                            border: `2px dashed ${COLORS.border}`
                        }}>
                            <div style={{ fontSize: '48px', marginBottom: '24px', color: '#cbd5e1' }}>📊</div>
                            <h3 style={{ fontSize: '20px', fontWeight: '700', color: COLORS.text, marginBottom: '8px' }}>
                                Ready to Generate
                            </h3>
                            <p style={{ color: COLORS.textSecondary, maxWidth: '400px', textAlign: 'center', marginBottom: '32px' }}>
                                Configure your report settings on the left to generate actionable insights, team workload analysis, and project metrics.
                            </p>

                            <div style={{ display: 'flex', gap: '24px' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>🤖</div>
                                    <div style={{ fontSize: '12px', fontWeight: '600' }}>AI Insights</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>📈</div>
                                    <div style={{ fontSize: '12px', fontWeight: '600' }}>Visual Charts</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>👥</div>
                                    <div style={{ fontSize: '12px', fontWeight: '600' }}>Team Workload</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
