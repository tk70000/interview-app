import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { getErrorMessage } from '@/lib/utils'

// 管理者用チャット一覧取得
export async function GET(request: NextRequest) {
  try {
    // 管理者認証チェック
    const adminAuth = checkAdminAuth(request)
    if (!adminAuth.isAdmin) {
      return NextResponse.json(
        { error: '管理者権限が必要です', authMethod: adminAuth.method },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100) // 最大100件
    const candidateId = searchParams.get('candidateId')
    const sessionId = searchParams.get('sessionId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const supabase = getServiceSupabase()
    const offset = (page - 1) * limit

    // ベースクエリ（admin_noteの存在を確認しながら段階的に取得）
    let basicQuery = supabase
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
          cv_summary
        )
      `)
      .order('started_at', { ascending: false })

    // admin_noteカラムが存在する場合のみ含める
    let query = basicQuery
    
    // 開発環境では詳細なエラーログを出力
    if (process.env.NODE_ENV === 'development') {
      console.log('Querying sessions table with Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log('Service key exists:', !!process.env.SERVICE_KEY || !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    }

    // フィルター適用
    if (candidateId) {
      query = query.eq('candidate_id', candidateId)
    }
    if (sessionId) {
      query = query.eq('id', sessionId)
    }
    if (startDate) {
      query = query.gte('started_at', startDate)
    }
    if (endDate) {
      query = query.lte('started_at', endDate)
    }

    // ページネーション
    query = query.range(offset, offset + limit - 1)

    // まず基本的なクエリを実行
    const { data: sessions, error, count } = await query

    if (error) {
      console.error('セッション取得エラー詳細:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      })
      
      // admin_noteカラムが原因の場合は、カラムなしで再試行
      if (error.message?.includes('admin_note')) {
        console.log('admin_noteカラムエラーを検出。基本クエリで再試行します。')
        const { data: fallbackSessions, error: fallbackError } = await basicQuery
          .range(offset, offset + limit - 1)
        
        if (!fallbackError && fallbackSessions) {
          // admin_noteとadmin_updated_atをnullとして追加
          const sessionsWithAdminFields = fallbackSessions.map(session => ({
            ...session,
            admin_note: null,
            admin_updated_at: null
          }))
          
          return NextResponse.json({
            sessions: await Promise.all(
              sessionsWithAdminFields.map(async (session) => {
                const { count: messageCount } = await supabase
                  .from('messages')
                  .select('*', { count: 'exact', head: true })
                  .eq('session_id', session.id)

                return {
                  ...session,
                  message_count: messageCount || 0
                }
              })
            ),
            pagination: {
              page,
              limit,
              total: count || 0,
              totalPages: Math.ceil((count || 0) / limit)
            },
            adminAuth: {
              method: adminAuth.method,
              email: adminAuth.email
            },
            warning: 'admin_noteカラムが見つからないため、一部機能が制限されています。'
          })
        }
      }
      
      throw new Error(`セッションの取得に失敗しました: ${error.message}`)
    }

    // 各セッションのメッセージ数を取得
    const sessionsWithMessageCount = await Promise.all(
      (sessions || []).map(async (session) => {
        const { count: messageCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', session.id)

        return {
          ...session,
          message_count: messageCount || 0
        }
      })
    )

    // 総件数取得（フィルター適用）
    let countQuery = supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })

    if (candidateId) countQuery = countQuery.eq('candidate_id', candidateId)
    if (sessionId) countQuery = countQuery.eq('id', sessionId)
    if (startDate) countQuery = countQuery.gte('started_at', startDate)
    if (endDate) countQuery = countQuery.lte('started_at', endDate)

    const { count: totalCount } = await countQuery

    return NextResponse.json({
      sessions: sessionsWithMessageCount,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      },
      adminAuth: {
        method: adminAuth.method,
        email: adminAuth.email
      }
    })

  } catch (error) {
    console.error('管理者チャット一覧取得エラー:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}