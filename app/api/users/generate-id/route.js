import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase env vars');
    }

    return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET() {
    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.rpc('get_next_dc_id');

        if (error) {
            console.error('get_next_dc_id RPC error:', error);
            return Response.json({ error: error.message }, { status: 500 });
        }

        return Response.json({ nextId: data });
    } catch (error) {
        console.error('Generate ID error:', error);
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}
