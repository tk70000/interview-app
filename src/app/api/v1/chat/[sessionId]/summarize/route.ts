import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'
import { generateChatSummary, saveChatSummaryToSession, updateCandidateProfile } from '@/lib/chat-summarizer'
import { getErrorMessage } from '@/lib/utils'

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { sessionId } = params
  
  if (!sessionId) {
    return NextResponse.json(
      { error: 'セッションIDが必要です' },
      { status: 400 }
    )
  }

  try {
    const supabase = getServiceSupabase()
    
    // セッション情報を取得
    console.log('セッションID:', sessionId)
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()
      
    console.log('セッション取得結果:', { session, sessionError })
      
    if (sessionError || !session) {
      console.error('セッション取得エラー:', sessionError)
      return NextResponse.json(
        { 
          error: 'セッションが見つかりません',
          details: sessionError?.message,
          sessionId: sessionId
        },
        { status: 404 }
      )
    }
    
    // 候補者情報を別途取得
    let candidate = null
    if (session.candidate_id) {
      const { data: candidateData, error: candidateError } = await supabase
        .from('candidates')
        .select('id, name, cv_text, cv_summary, skills_extracted, preferences')
        .eq('id', session.candidate_id)
        .single()
        
      if (candidateError) {
        console.warn('候補者情報取得エラー:', candidateError)
      } else {
        candidate = candidateData
      }
    }
    
    // sessionオブジェクトにcandidateを追加
    const sessionWithCandidate = {
      ...session,
      candidates: candidate
    }
    
    // すでに要約済みの場合はスキップ
    if (session.chat_summary && session.chat_embedding) {
      return NextResponse.json({
        message: 'すでに要約済みです',
        summary: session.chat_summary,
        extractedRequirements: session.extracted_requirements
      })
    }
    
    // メッセージ履歴を取得
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      
    if (messagesError || !messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'メッセージが見つかりません' },
        { status: 404 }
      )
    }
    
    // チャット要約を生成
    const cvSummary = sessionWithCandidate.candidates?.cv_summary || ''
    const summaryResult = await generateChatSummary(messages, cvSummary)
    
    // セッションに要約を保存
    await saveChatSummaryToSession(sessionId, summaryResult)
    
    // 候補者プロファイルも更新
    if (sessionWithCandidate.candidate_id) {
      await updateCandidateProfile(
        sessionWithCandidate.candidate_id,
        cvSummary,
        summaryResult
      )
    }
    
    // セッションステータスを更新（要約完了）
    await supabase
      .from('sessions')
      .update({
        status: 'summarized',
        ended_at: new Date().toISOString()
      })
      .eq('id', sessionId)
    
    return NextResponse.json({
      success: true,
      summary: summaryResult.summary,
      extractedRequirements: summaryResult.extractedRequirements,
      message: 'チャット要約が完了しました'
    })
    
  } catch (error) {
    console.error('チャット要約エラー:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}