import { createClient } from '@/lib/supabase-server'
import { Session } from '@/types'

export class SessionManager {
  // ユーザーの最新セッションを取得
  static async getLatestSession(userId: string): Promise<Session | null> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('user_latest_sessions')
      .select(`
        latest_session_id,
        sessions!inner(
          id,
          candidate_id,
          created_at,
          is_active,
          summary,
          messages:messages(count)
        )
      `)
      .eq('user_id', userId)
      .single()
    
    if (error || !data) {
      return null
    }

    return data.sessions as unknown as Session
  }

  // ユーザーの全セッションを取得
  static async getUserSessions(userId: string) {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        candidate:candidates!inner(*),
        message_count:messages(count),
        metadata:session_metadata(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching user sessions:', error)
      return []
    }

    return data || []
  }

  // セッションを継続
  static async continueSession(sessionId: string, userId: string): Promise<void> {
    const supabase = await createClient()
    
    // セッションの所有者確認
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('user_id')
      .eq('id', sessionId)
      .single()
    
    if (sessionError || !session || session.user_id !== userId) {
      throw new Error('セッションが見つかりません')
    }
    
    // セッションをアクティブに設定
    const { error: updateError } = await supabase
      .from('sessions')
      .update({ is_active: true })
      .eq('id', sessionId)
    
    if (updateError) {
      throw new Error('セッションの更新に失敗しました')
    }
    
    // 最終アクセス時刻を更新
    await this.updateLastAccess(sessionId)
  }

  // 新規セッション作成時の処理
  static async createNewSession(
    userId: string, 
    candidateId: string
  ): Promise<string> {
    const supabase = await createClient()
    
    // 既存のアクティブセッションをアーカイブ
    await this.archiveActiveSessions(userId)
    
    // 新規セッション作成
    const { data: newSession, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        candidate_id: candidateId,
        user_id: userId,
        is_active: true,
      })
      .select()
      .single()
    
    if (sessionError || !newSession) {
      throw new Error('セッションの作成に失敗しました')
    }
    
    // ユーザーの最新セッション情報を更新
    await this.updateLatestSession(userId, newSession.id, candidateId)
    
    // メタデータを初期化
    await supabase
      .from('session_metadata')
      .insert({
        session_id: newSession.id,
        total_messages: 0,
      })
    
    return newSession.id
  }

  // アクティブセッションをアーカイブ
  private static async archiveActiveSessions(userId: string): Promise<void> {
    const supabase = await createClient()
    
    await supabase
      .from('sessions')
      .update({ 
        is_active: false,
        archived_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('is_active', true)
  }

  // 最新セッション情報を更新
  private static async updateLatestSession(
    userId: string,
    sessionId: string,
    candidateId: string
  ): Promise<void> {
    const supabase = await createClient()
    
    await supabase
      .from('user_latest_sessions')
      .upsert({
        user_id: userId,
        latest_session_id: sessionId,
        latest_cv_id: candidateId,
        updated_at: new Date().toISOString(),
      })
  }

  // 最終アクセス時刻を更新
  private static async updateLastAccess(sessionId: string): Promise<void> {
    const supabase = await createClient()
    
    await supabase
      .from('session_metadata')
      .upsert({
        session_id: sessionId,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
  }

  // セッションの会話履歴を取得
  static async getSessionMessages(sessionId: string) {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('Error fetching messages:', error)
      return []
    }

    return data || []
  }
}