import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { sessionId } = await request.json();
    if (!sessionId) {
      return new NextResponse('Session ID is required', { status: 400 });
    }

    // Verify session ownership
    const { data: existingSession, error: sessionError } = await supabase
      .from('sessions')
      .select('user_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !existingSession) {
      return new NextResponse('Session not found', { status: 404 });
    }

    if (existingSession.user_id !== session.user.id) {
      return new NextResponse('Unauthorized', { status: 403 });
    }

    // Reactivate session
    const { error: updateError } = await supabase
      .from('sessions')
      .update({ 
        is_active: true,
        archived_at: null 
      })
      .eq('id', sessionId);

    if (updateError) {
      throw updateError;
    }

    // Update metadata
    await supabase
      .from('session_metadata')
      .update({ updated_at: new Date().toISOString() })
      .eq('session_id', sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to continue session:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}