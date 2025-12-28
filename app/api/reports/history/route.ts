import { NextRequest, NextResponse } from 'next/server';
import { getReportHistory } from '../../../reporting';
import { supabase } from '../../../reporting/dal';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        const filters = {
            reportType: searchParams.get('reportType') || undefined,
            startDate: searchParams.get('startDate') || undefined,
            endDate: searchParams.get('endDate') || undefined,
            limit: parseInt(searchParams.get('limit') || '50')
        };

        const history = await getReportHistory(supabase, filters);

        return NextResponse.json({ reports: history });

    } catch (error: any) {
        console.error('Failed to fetch report history:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch history' },
            { status: 500 }
        );
    }
}
