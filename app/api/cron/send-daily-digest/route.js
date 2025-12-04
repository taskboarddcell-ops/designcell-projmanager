// app/api/cron/send-daily-digest/route.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase env vars');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/cron/send-daily-digest
 * Trigger daily digest email sending
 * Can be called by:
 * - Vercel Cron (with authorization)
 * - Manual testing
 */
export async function POST(request) {
  try {
    // Optional: Check authorization header for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('Unauthorized cron request');
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Call the Edge Function to send digests
    const { data, error } = await supabase.functions.invoke('send-daily-digest', {
      method: 'POST',
    });

    if (error) {
      console.error('Send daily digest error:', error);
      return Response.json(
        { error: 'Failed to send digests' },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      result: data,
    });
  } catch (error) {
    console.error('Daily digest cron error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
