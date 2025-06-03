import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { getErrorMessage } from '@/lib/utils'

// 特定セッションの詳細チャット履歴取得
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // 管理者認証チェック
    const adminAuth = checkAdminAuth(request)
    if (!adminAuth.isAdmin) {
      return NextResponse.json(
        { error: '管理者権限が必要です', authMethod: adminAuth.method },
        { status: 403 }
      )
    }

    const { sessionId } = params
    const supabase = getServiceSupabase()

    // セッション基本情報を取得（admin_noteエラーに対応）
    let session = null
    let sessionError = null
    
    try {
      // まずadmin_note付きで試行
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id,
          candidate_id,
          status,
          started_at,
          ended_at,
          summary,
          admin_note,
          admin_updated_at,
          candidates (
            id,
            name,
            email,
            cv_summary,
            cv_url,
            created_at
          )
        `)
        .eq('id', sessionId)
        .single()
      
      session = data
      sessionError = error
    } catch (e) {
      sessionError = e
    }
    
    // admin_noteカラムエラーの場合、カラムなしで再試行
    if (sessionError && sessionError.message?.includes('admin_note')) {
      console.log('admin_noteカラムエラーを検出。基本クエリで再試行します。')
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id,
          candidate_id,
          status,
          started_at,
          ended_at,
          summary,
          candidates (
            id,
            name,
            email,
            cv_summary,
            cv_url,
            created_at
          )
        `)
        .eq('id', sessionId)
        .single()
      
      if (!error && data) {
        session = {
          ...data,
          admin_note: null,
          admin_updated_at: null
        }
        sessionError = null
      } else {
        sessionError = error
      }
    }

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404 }
      )
    }

    // チャットメッセージを時系列順で取得
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('メッセージ取得エラー:', messagesError)
      throw new Error(`メッセージの取得に失敗しました: ${messagesError.message}`)
    }

    // デバッグ: メッセージ内容を確認
    console.log(`Session ${sessionId} - Total messages: ${messages?.length}`)
    messages?.forEach((msg, index) => {
      console.log(`Message ${index + 1} (${msg.role}):`);
      console.log(`- Contains newlines: ${msg.content.includes('\n')}`)
      console.log(`- Length: ${msg.content.length}`)
      console.log(`- First 100 chars: ${msg.content.substring(0, 100)}...`)
      if (msg.content.includes('\n')) {
        console.log(`- Line count: ${msg.content.split('\n').length}`)
      }
    })

    // 統計情報を計算
    const stats = {
      totalMessages: messages?.length || 0,
      userMessages: messages?.filter(m => m.role === 'user').length || 0,
      assistantMessages: messages?.filter(m => m.role === 'assistant').length || 0,
      firstMessageAt: messages?.[0]?.created_at,
      lastMessageAt: messages?.[messages.length - 1]?.created_at,
      sessionDuration: messages && messages.length > 1 
        ? new Date(messages[messages.length - 1].created_at).getTime() - 
          new Date(messages[0].created_at).getTime()
        : 0
    }

    return NextResponse.json({
      session,
      messages: messages || [],
      stats,
      adminAuth: {
        method: adminAuth.method,
        email: adminAuth.email
      }
    })

  } catch (error) {
    console.error('管理者チャット詳細取得エラー:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}

// セッションの管理者メモを追加/更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // 管理者認証チェック
    const adminAuth = checkAdminAuth(request)
    if (!adminAuth.isAdmin) {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      )
    }

    const { sessionId } = params
    const { adminNote, status } = await request.json()

    const supabase = getServiceSupabase()

    // セッション情報を更新
    const updateData: any = {}
    if (adminNote !== undefined) updateData.admin_note = adminNote
    if (status !== undefined) updateData.status = status

    const { data, error } = await supabase
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single()

    if (error) {
      console.error('セッション更新エラー:', error)
      throw new Error(`セッションの更新に失敗しました: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      session: data,
      adminAuth: {
        method: adminAuth.method,
        email: adminAuth.email
      }
    })

  } catch (error) {
    console.error('管理者セッション更新エラー:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}