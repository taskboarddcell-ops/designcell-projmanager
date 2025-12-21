import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase env vars:', {
            hasUrl: !!supabaseUrl,
            hasKey: !!supabaseServiceKey
        });
        throw new Error('Missing Supabase env vars');
    }

    return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET() {
    try {
        console.log('[generate-id] Starting request');
        const supabase = getSupabaseClient();

        // Use direct SQL query instead of RPC for better reliability
        const { data, error } = await supabase
            .from('users')
            .select('staff_id')
            .like('staff_id', 'DC%')
            .order('staff_id', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
            console.error('[generate-id] Query error:', error);
            return Response.json({ error: error.message }, { status: 500 });
        }

        let nextNum = 1;
        if (data && data.staff_id) {
            // Extract number from DC## format
            const match = data.staff_id.match(/^DC(\d+)$/);
            if (match) {
                nextNum = parseInt(match[1], 10) + 1;
            }
        }

        const nextId = 'DC' + String(nextNum).padStart(2, '0');
        console.log('[generate-id] Generated ID:', nextId);

        return Response.json({ nextId });
    } catch (error) {
        console.error('[generate-id] Exception:', error);
        return Response.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 });
    }
}
