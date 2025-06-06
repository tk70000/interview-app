import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'
import { productionGuard } from '@/lib/debug-guard'
import { debugLog } from '@/lib/debug-logger'

export async function GET(request: NextRequest) {
  // 本番環境でのアクセスを制限
  const guard = productionGuard()
  if (guard) return guard
  
  try {
    const supabase = getServiceSupabase()
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    
    debugLog.log('デバッグ: 求人マッチング診断開始', { sessionId })
    
    // 1. セッション情報を確認
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()
    
    debugLog.log('デバッグ: セッション情報', { session, sessionError })
    
    // 2. 候補者情報を確認
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
    
    debugLog.log('デバッグ: 候補者情報', { candidate, candidateError })
    
    // 3. 求人データの件数を確認
    const { count: jobCount, error: jobCountError } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
    
    debugLog.log('デバッグ: 求人データ件数', { jobCount, jobCountError })
    
    // 4. PostgreSQL関数の存在確認
    let functionExists = false
    let functionError = null
    try {
      const { data: testResult, error: testError } = await supabase
        .rpc('match_jobs_for_candidate', {
          p_candidate_id: session?.candidate_id || '00000000-0000-0000-0000-000000000000',
          p_session_id: sessionId || '00000000-0000-0000-0000-000000000000',
          match_count: 1
        })
      functionExists = !testError
      functionError = testError
      debugLog.log('デバッグ: 関数テスト結果', { testResult, testError })
    } catch (e) {
      functionError = e
      debugLog.log('デバッグ: 関数テスト例外', e)
    }
    
    // 5. ベクトルデータの確認
    const hasProfileEmbedding = candidate?.profile_embedding != null
    const hasChatEmbedding = session?.chat_embedding != null
    
    debugLog.log('デバッグ: ベクトルデータ', {
      hasProfileEmbedding,
      hasChatEmbedding,
      profileEmbeddingLength: candidate?.profile_embedding?.length,
      chatEmbeddingLength: session?.chat_embedding?.length
    })
    
    // 6. 簡単な求人検索テスト
    let simpleJobQuery = null
    let simpleJobError = null
    try {
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, company_name, job_title, is_active, embedding')
        .eq('is_active', true)
        .limit(3)
      
      simpleJobQuery = jobs
      simpleJobError = jobsError
      debugLog.log('デバッグ: 簡単な求人検索', { 
        jobsCount: jobs?.length, 
        jobsError,
        sampleJobs: jobs?.map(j => ({ 
          id: j.id, 
          company: j.company_name, 
          title: j.job_title,
          hasEmbedding: j.embedding != null 
        }))
      })
    } catch (e) {
      simpleJobError = e
      debugLog.log('デバッグ: 求人検索例外', e)
    }
    
    return NextResponse.json({
      success: true,
      debug_info: {
        session: {
          found: !!session,
          id: session?.id,
          candidate_id: session?.candidate_id,
          status: session?.status,
          hasData: !!session,
          error: sessionError
        },
        candidate: {
          found: !!candidate,
          id: candidate?.id,
          name: candidate?.name,
          hasProfileEmbedding,
          profileEmbeddingLength: candidate?.profile_embedding?.length,
          error: candidateError
        },
        jobs: {
          totalCount: jobCount,
          sampleJobs: simpleJobQuery,
          error: jobCountError || simpleJobError
        },
        vectors: {
          hasProfileEmbedding,
          hasChatEmbedding,
          profileEmbeddingLength: candidate?.profile_embedding?.length,
          chatEmbeddingLength: session?.chat_embedding?.length
        },
        database_function: {
          exists: functionExists,
          error: functionError
        }
      }
    })
    
  } catch (error) {
    debugLog.error('求人マッチングデバッグエラー:', error)
    return NextResponse.json(
      { error: `診断に失敗しました: ${error}` },
      { status: 500 }
    )
  }
}