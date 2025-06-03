import { supabase } from '@/lib/supabase'
import { Session } from '@/types'

export class SessionManagerClient {
  // ユーザーの最新セッションを取得（クライアント用）
  static async getLatestSession(userId: string): Promise<Session | null> {
    // 現在のユーザー情報を取得
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // ユーザーのcandidate情報を取得
    const { data: candidate } = await supabase
      .from('candidates')
      .select('id')
      .eq('email', user.email)
      .single()

    if (!candidate) return null

    // 最新のアクティブセッションを取得
    const { data: session, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('candidate_id', candidate.id)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !session) {
      return null
    }

    return session
  }

  // アクティブなセッションを取得（クライアント用）
  static async getActiveSession(candidateId: string): Promise<Session | null> {
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('candidate_id', candidateId)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !sessions) {
      console.error('アクティブセッション取得エラー:', error)
      return null
    }

    return sessions
  }

  // 新しいセッションを作成（クライアント用）
  static async createSession(candidateId: string): Promise<Session | null> {
    const { data: session, error } = await supabase
      .from('sessions')
      .insert({
        candidate_id: candidateId,
        status: 'active',
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error || !session) {
      console.error('セッション作成エラー:', error)
      return null
    }

    return session
  }

  // ユーザーのすべてのセッションを取得（クライアント用）
  static async getUserSessions(userId: string): Promise<Session[]> {
    // 現在のユーザー情報を取得
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    // ユーザーのcandidate情報を取得
    const { data: candidate } = await supabase
      .from('candidates')
      .select('id')
      .eq('email', user.email)
      .single()

    if (!candidate) return []

    // candidateに紐づくセッションを取得
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('candidate_id', candidate.id)
      .order('started_at', { ascending: false })

    if (error || !sessions) {
      console.error('セッション取得エラー:', error)
      return []
    }

    return sessions
  }
}