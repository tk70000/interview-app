import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceSupabase()
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId parameter is required' }, { status: 400 })
    }
    
    console.log('セッションベクトル調査開始:', sessionId)
    
    // 1. セッション情報を取得
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()
    
    // 2. 候補者情報を取得
    let candidate = null
    let candidateError = null
    if (session?.candidate_id) {
      const result = await supabase
        .from('candidates')
        .select('*')
        .eq('id', session.candidate_id)
        .single()
      candidate = result.data
      candidateError = result.error
    }
    
    // 3. メッセージ数を確認
    const { count: messageCount, error: messageError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
    
    console.log('セッションベクトル調査結果:', {
      sessionFound: !!session,
      candidateFound: !!candidate,
      messageCount,
      hasChatEmbedding: session?.chat_embedding != null,
      hasProfileEmbedding: candidate?.profile_embedding != null
    })
    
    return NextResponse.json({
      success: true,
      session_analysis: {
        session: {
          id: session?.id,
          status: session?.status,
          candidate_id: session?.candidate_id,
          has_chat_summary: !!session?.chat_summary,
          has_chat_embedding: session?.chat_embedding != null,
          chat_embedding_length: session?.chat_embedding?.length,
          has_extracted_requirements: !!session?.extracted_requirements,
          extracted_requirements: session?.extracted_requirements,
          error: sessionError
        },
        candidate: {
          id: candidate?.id,
          name: candidate?.name,
          email: candidate?.email,
          has_cv_summary: !!candidate?.cv_summary,
          has_profile_summary: !!candidate?.profile_summary,
          has_profile_embedding: candidate?.profile_embedding != null,
          profile_embedding_length: candidate?.profile_embedding?.length,
          has_skills_extracted: !!candidate?.skills_extracted,
          skills_extracted: candidate?.skills_extracted,
          preferences: candidate?.preferences,
          error: candidateError
        },
        messages: {
          count: messageCount,
          error: messageError
        }
      }
    })
    
  } catch (error) {
    console.error('セッションベクトル調査エラー:', error)
    return NextResponse.json(
      { error: `セッションベクトルの調査に失敗しました: ${error}` },
      { status: 500 }
    )
  }
}