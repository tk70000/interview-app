import { NextRequest, NextResponse } from 'next/server'
import { generateId, getErrorMessage, isSessionTimeout } from '@/lib/utils'
import { generateEmbedding, generateFollowUpQuestion } from '@/lib/openai'
import { supabase } from '@/lib/supabase'
import { Message } from '@/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    
    let body
    try {
      body = await request.json()
    } catch (jsonError) {
      return NextResponse.json(
        { error: '無効なJSONリクエストです' },
        { status: 400 }
      )
    }
    
    const { content } = body

    if (!content) {
      return NextResponse.json(
        { error: 'メッセージ内容が必要です' },
        { status: 400 }
      )
    }

    // セッション情報を取得
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404 }
      )
    }

    // セッションタイムアウトチェック
    if (session.status === 'timeout' || isSessionTimeout(session.started_at)) {
      // まだタイムアウトステータスでない場合は更新
      if (session.status !== 'timeout') {
        await supabase
          .from('sessions')
          .update({ 
            status: 'timeout',
            ended_at: new Date().toISOString()
          })
          .eq('id', sessionId)
      }

      return NextResponse.json(
        { error: 'セッションがタイムアウトしました' },
        { status: 408 }
      )
    }
    
    // アクティブでないセッションへのアクセスを拒否
    if (session.status !== 'active') {
      return NextResponse.json(
        { error: 'このセッションは終了しています' },
        { status: 403 }
      )
    }

    // ユーザーメッセージを保存
    const userMessageId = generateId()
    const userMessage: Message = {
      id: userMessageId,
      session_id: sessionId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }

    const { error: userMessageError } = await supabase
      .from('messages')
      .insert(userMessage)

    if (userMessageError) {
      throw new Error(`メッセージの保存に失敗しました: ${userMessageError.message}`)
    }

    // 埋め込みベクトルを生成・保存
    const embedding = await generateEmbedding(content)
    const { error: embeddingError } = await supabase
      .from('embeddings')
      .insert({
        message_id: userMessageId,
        vector: embedding,
      })

    if (embeddingError) {
      console.error('埋め込みの保存エラー:', embeddingError)
    }

    // 会話履歴を取得
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(10)

    if (messagesError) {
      throw new Error(`会話履歴の取得に失敗しました: ${messagesError.message}`)
    }

    // 最後の質問を取得
    const lastAssistantMessage = messages
      .filter(m => m.role === 'assistant')
      .pop()

    // アシスタントメッセージの保存は/streamエンドポイントで行うため、
    // ここでは成功レスポンスのみ返す
    return NextResponse.json({
      success: true,
      message: userMessage,
    })
  } catch (error) {
    console.error('Chat message error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: getErrorMessage(error) 
      },
      { status: 500 }
    )
  }
}
