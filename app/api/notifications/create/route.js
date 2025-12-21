// app/api/notifications/create/route.js
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

/**
 * POST /api/notifications/create
 * Create notifications (uses service role to bypass RLS)
 * Body: { notifications: Array<{ user_id, type, title, body?, link_url? }> }
 */
export async function POST(request) {
    try {
        const supabase = getSupabaseClient();
        const body = await request.json();

        const { notifications } = body;

        if (!notifications || !Array.isArray(notifications) || notifications.length === 0) {
            return Response.json(
                { error: 'notifications array is required' },
                { status: 400 }
            );
        }

        // Validate each notification
        for (const notif of notifications) {
            if (!notif.user_id || !notif.type || !notif.title) {
                return Response.json(
                    { error: 'Each notification requires user_id, type, and title' },
                    { status: 400 }
                );
            }
        }

        // Insert notifications using service role
        const { data, error } = await supabase
            .from('notifications')
            .insert(notifications)
            .select();

        if (error) {
            console.error('Create notifications error:', error);
            return Response.json(
                { error: 'Failed to create notifications', details: error.message },
                { status: 500 }
            );
        }

        return Response.json({
            success: true,
            created: data?.length || 0,
            notifications: data || []
        });
    } catch (error) {
        console.error('Notifications POST error:', error);
        return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
