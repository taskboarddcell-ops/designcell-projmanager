// app/api/notifications/mark-all-read/route.js
import { createClient } from '@supabase/supabase-js';

// Prevent this route from being pre-rendered during build
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
 * POST /api/notifications/mark-all-read
 * Mark all unread notifications as read for the user
 * Body: { userId: string }
 */
export async function POST(request) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json().catch(() => ({}));
    const { userId } = body;

    if (!userId) {
      return Response.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get count of unread
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    // Mark all unread as read
    const { error: updateError } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (updateError) {
      console.error('Mark all read error:', updateError);
      return Response.json(
        { error: 'Failed to mark notifications as read' },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      count: unreadCount || 0,
    });
  } catch (error) {
    console.error('Mark all read POST error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
