import { NextRequest, NextResponse } from 'next/server';
import { getReportById } from '../../../reporting';
import { supabase } from '../../../reporting/dal';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const format = searchParams.get('format') || 'json';

        console.log('=== GET REPORT BY ID ===');
        console.log('Report ID:', id);
        console.log('Format:', format);

        const report = await getReportById(supabase, id);

        console.log('Report found:', !!report);
        if (!report) {
            console.log('Report not found for ID:', id);
        }
        console.log('========================');

        if (!report) {
            return NextResponse.json(
                { error: 'Report not found' },
                { status: 404 }
            );
        }

        // Render HTML on-demand from cached JSON data
        const reportData = {
            meta: {
                reportType: report.run.report_type,
                startDate: report.run.start_date,
                endDate: report.run.end_date,
                timezone: report.run.timezone,
                projectIds: report.run.filters_json?.projectIds,
                staffId: report.run.filters_json?.staffId,
                output: 'html'
            },
            metrics: report.artifact.metrics_json,
            narrative: report.artifact.narrative_json,
            factsPacket: {} // Not needed for rendering
        };

        if (format === 'pdf') {
            const { renderHtml } = await import('../../../reporting/htmlTemplate');
            const { generatePdf } = await import('../../../reporting/pdf');

            const html = renderHtml(reportData as any);
            const pdf = await generatePdf(html);

            return new NextResponse(new Uint8Array(pdf), {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="report-${id}.pdf"`
                }
            });
        }

        if (format === 'html') {
            const { renderHtml } = await import('../../../reporting/htmlTemplate');
            const html = renderHtml(reportData as any);

            return new NextResponse(html, {
                headers: {
                    'Content-Type': 'text/html'
                }
            });
        }

        return NextResponse.json({
            run: report.run,
            artifact: {
                ...report.artifact,
                // Return JSON data only
                metrics_json: report.artifact.metrics_json,
                narrative_json: report.artifact.narrative_json
            }
        });

    } catch (error: any) {
        console.error('Failed to fetch report:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch report' },
            { status: 500 }
        );
    }
}
