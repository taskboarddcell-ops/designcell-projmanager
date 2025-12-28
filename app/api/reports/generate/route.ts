import { NextRequest, NextResponse } from 'next/server';
import { generateReport } from '../../../reporting';
import { ReportRequest } from '../../../reporting/types';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as ReportRequest;

        // Validate request
        if (!body.reportType || !body.startDate || !body.endDate) {
            return NextResponse.json(
                { error: 'Missing required fields: reportType, startDate, endDate' },
                { status: 400 }
            );
        }

        // TODO: Get user from session/auth
        const userId = request.headers.get('x-user-id') || undefined;
        const userName = request.headers.get('x-user-name') || undefined;

        // Generate report
        const result = await generateReport(body, userId, userName);

        if (body.output === 'pdf' && result.pdf) {
            return new NextResponse(new Uint8Array(result.pdf), {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="report-${result.reportRunId}.pdf"`,
                    'X-Report-Run-Id': result.reportRunId,
                    'X-From-Cache': result.fromCache.toString()
                }
            });
        }

        return NextResponse.json({
            reportRunId: result.reportRunId,
            fromCache: result.fromCache,
            html: result.html
        });

    } catch (error: any) {
        console.error('Report generation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate report' },
            { status: 500 }
        );
    }
}
