import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export class SessionManager {
  private static supabase = createClientComponentClient();

  static async getLatestSession(userId: string) {
    const { data: latestSession, error: latestError } = await this.supabase
      .from('user_latest_sessions')
      .select(`
        latest_session_id,
        sessions!inner(
          id,
          candidate_id,
          created_at,
          summary,
          messages(count)
        )
      `)
      .eq('user_id', userId)
      .single();

    if (latestError) {
      throw new Error(`Failed to fetch latest session: ${latestError.message}`);
    }

    return latestSession?.sessions || null;
  }

  static async continueSession(sessionId: string, userId: string) {
    const { data: session, error: sessionError } = await this.supabase
      .from('sessions')
      .select('user_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error('Session not found');
    }

    if (session.user_id !== userId) {
      throw new Error('Unauthorized access to session');
    }

    const { error: updateError } = await this.supabase
      .from('sessions')
      .update({ 
        is_active: true,
        archived_at: null 
      })
      .eq('id', sessionId);

    if (updateError) {
      throw new Error(`Failed to continue session: ${updateError.message}`);
    }

    await this.updateLastAccess(sessionId);
  }

  static async createNewSession(userId: string, candidateId: string) {
    // Archive existing active sessions
    await this.archiveActiveSessions(userId);

    // Create new session
    const { data: session, error: sessionError } = await this.supabase
      .from('sessions')
      .insert({
        user_id: userId,
        candidate_id: candidateId,
        is_active: true
      })
      .select()
      .single();

    if (sessionError || !session) {
      throw new Error(`Failed to create session: ${sessionError?.message}`);
    }

    // Initialize session metadata
    await this.supabase
      .from('session_metadata')
      .insert({
        session_id: session.id,
        total_messages: 0
      });

    // Update latest session record
    await this.updateLatestSession(userId, session.id, candidateId);

    return session.id;
  }

  private static async updateLastAccess(sessionId: string) {
    await this.supabase
      .from('session_metadata')
      .update({ updated_at: new Date().toISOString() })
      .eq('session_id', sessionId);
  }

  private static async archiveActiveSessions(userId: string) {
    await this.supabase
      .from('sessions')
      .update({
        is_active: false,
        archived_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('is_active', true);
  }

  private static async updateLatestSession(
    userId: string,
    sessionId: string,
    candidateId: string
  ) {
    await this.supabase
      .from('user_latest_sessions')
      .upsert({
        user_id: userId,
        latest_session_id: sessionId,
        latest_cv_id: candidateId,
        updated_at: new Date().toISOString()
      });
  }
}