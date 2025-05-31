import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { isSessionTimeout } from '@/lib/utils'

// このエンドポイントは定期的に呼び出されるべき（例：Vercel Cron Jobs）
export async function GET(request: NextRequest) {
  try {
    // 認証チェック（cronジョブ用の秘密トークン）
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // アクティブなセッションを取得
    const { data: activeSessions, error: fetchError } = await supabase
      .from('sessions')
      .select('*')
      .eq('status', 'active')

    if (fetchError) {
      throw new Error(`セッションの取得に失敗しました: ${fetchError.message}`)
    }

    let updatedCount = 0
    const now = new Date().toISOString()

    // タイムアウトしたセッションを更新
    for (const session of activeSessions || []) {
      if (isSessionTimeout(session.started_at)) {
        const { error: updateError } = await supabase
          .from('sessions')
          .update({
            status: 'timeout',
            ended_at: now,
          })
          .eq('id', session.id)

        if (!updateError) {
          updatedCount++
        } else {
          console.error(`セッション ${session.id} の更新エラー:`, updateError)
        }
      }
    }

    // 古いセッションのクリーンアップ（30日以上前）
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { data: oldSessions, error: oldSessionsError } = await supabase
      .from('sessions')
      .select('id')
      .lt('created_at', thirtyDaysAgo.toISOString())

    if (!oldSessionsError && oldSessions) {
      // 古いセッションに関連するメッセージと埋め込みを削除
      for (const session of oldSessions) {
        // まずメッセージIDを取得
        const { data: messages } = await supabase
          .from('messages')
          .select('id')
          .eq('session_id', session.id)

        if (messages) {
          // 埋め込みを削除
          const messageIds = messages.map(m => m.id)
          await supabase
            .from('embeddings')
            .delete()
            .in('message_id', messageIds)
        }

        // メッセージを削除
        await supabase
          .from('messages')
          .delete()
          .eq('session_id', session.id)

        // セッションを削除
        await supabase
          .from('sessions')
          .delete()
          .eq('id', session.id)
      }
    }

    return NextResponse.json({
      success: true,
      timedOutSessions: updatedCount,
      cleanedUpSessions: oldSessions?.length || 0,
    })
  } catch (error) {
    console.error('Session cleanup error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'クリーンアップエラー' 
      },
      { status: 500 }
    )
  }
}