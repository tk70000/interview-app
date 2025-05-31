import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { DashboardStats } from '@/types'

export async function GET(request: NextRequest) {
  try {
    // 候補者一覧を取得
    const { data: candidates, error: candidatesError } = await supabase
      .from('candidates')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (candidatesError) {
      throw new Error(`候補者の取得に失敗しました: ${candidatesError.message}`)
    }

    // アクティブセッションを取得
    const { data: activeSessions, error: activeSessionsError } = await supabase
      .from('sessions')
      .select('*')
      .eq('status', 'active')
      .order('started_at', { ascending: false })

    if (activeSessionsError) {
      throw new Error(`セッションの取得に失敗しました: ${activeSessionsError.message}`)
    }

    // 統計情報を計算
    const { data: allSessions, error: allSessionsError } = await supabase
      .from('sessions')
      .select('*')

    if (allSessionsError) {
      throw new Error(`統計情報の取得に失敗しました: ${allSessionsError.message}`)
    }

    // 各セッションのメッセージ数を取得
    const sessionIds = allSessions.map(s => s.id)
    const { data: messageCounts, error: messageCountError } = await supabase
      .from('messages')
      .select('session_id')
      .in('session_id', sessionIds)

    if (messageCountError) {
      console.error('メッセージ数の取得エラー:', messageCountError)
    }

    // セッションごとのメッセージ数を集計
    const messageCountBySession = new Map<string, number>()
    messageCounts?.forEach(m => {
      const count = messageCountBySession.get(m.session_id) || 0
      messageCountBySession.set(m.session_id, count + 1)
    })

    // 平均セッション時間を計算
    const completedSessions = allSessions.filter(s => s.status === 'completed' && s.ended_at)
    const totalDurationMs = completedSessions.reduce((sum, session) => {
      if (!session.ended_at) return sum // ended_atがnullの場合はスキップ
      const duration = new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()
      return sum + duration
    }, 0)
    const averageDurationMinutes = completedSessions.length > 0
      ? Math.round(totalDurationMs / completedSessions.length / 60000)
      : 0

    // 平均メッセージ数を計算
    const totalMessages = Array.from(messageCountBySession.values()).reduce((sum, count) => sum + count, 0)
    const averageMessages = messageCountBySession.size > 0
      ? Math.round(totalMessages / messageCountBySession.size)
      : 0

    const stats: DashboardStats = {
      total_candidates: candidates.length,
      active_sessions: activeSessions.length,
      completed_sessions: completedSessions.length,
      average_session_duration_minutes: averageDurationMinutes,
      average_messages_per_session: averageMessages,
    }

    return NextResponse.json({
      success: true,
      stats,
      candidates,
      activeSessions,
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'エラーが発生しました' 
      },
      { status: 500 }
    )
  }
}
