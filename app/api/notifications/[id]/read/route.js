// app/api/notifications/[id]/read/route.js
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase env vars');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * POST /api/notifications/[id]/read
 * Mark a single notification as read
 * Body: { userId: string }
 */
export async function POST(request, { params }) {
  try {
    const supabase = getSupabaseClient();
    const { id } = params;
    const body = await request.json().catch(() => ({}));
    const { userId } = body;

    if (!userId || !id) {
      return Response.json(
        { error: 'userId and id are required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !notification) {
      return Response.json(
        { error: 'Notification not found or access denied' },
        { status: 404 }
      );
    }

    // Mark as read
    const { data: updated, error: updateError } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Mark notification read error:', updateError);
      return Response.json(
        { error: 'Failed to mark notification as read' },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      notification: updated,
    });
  } catch (error) {
    console.error('Notification read POST error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
