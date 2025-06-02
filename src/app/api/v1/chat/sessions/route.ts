import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { data: latestSession, error: latestError } = await supabase
      .from('user_latest_sessions')
      .select(`
        latest_session_id,
        sessions!inner(
          id,
          candidate_id,
          created_at,
          messages(count),
          session_metadata(
            total_messages,
            last_message_at,
            ai_summary
          )
        )
      `)
      .eq('user_id', session.user.id)
      .single();

    if (latestError) {
      throw latestError;
    }

    return NextResponse.json(latestSession);
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}