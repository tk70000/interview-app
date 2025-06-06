import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceSupabase()
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId') || 'bac954bc-ed96-4a2b-a972-c456d659f358'
    const candidateId = searchParams.get('candidateId') || 'ea5074b1-ad9a-4215-a533-bd8058f88556'
    
    console.log('PostgreSQL関数テスト開始:', { sessionId, candidateId })
    
    // 1. 関数をさまざまなパラメータでテスト
    const tests = []
    
    // テスト1: デフォルトパラメータ
    try {
      const { data: result1, error: error1 } = await supabase
        .rpc('match_jobs_for_candidate', {
          p_candidate_id: candidateId,
          p_session_id: sessionId,
          match_count: 10
        })
      tests.push({
        name: 'デフォルトパラメータ (match_count=10)',
        success: !error1,
        result_count: result1?.length || 0,
        error: error1,
        sample_results: result1?.slice(0, 3)?.map((r: any) => ({
          job_id: r.job_id,
          company_name: r.company_name,
          job_title: r.job_title,
          similarity: r.similarity
        }))
      })
    } catch (e) {
      tests.push({
        name: 'デフォルトパラメータ (match_count=10)',
        success: false,
        error: e,
        result_count: 0
      })
    }
    
    // テスト2: より多くの結果を要求
    try {
      const { data: result2, error: error2 } = await supabase
        .rpc('match_jobs_for_candidate', {
          p_candidate_id: candidateId,
          p_session_id: sessionId,
          match_count: 50
        })
      tests.push({
        name: '多めの結果 (match_count=50)',
        success: !error2,
        result_count: result2?.length || 0,
        error: error2,
        sample_results: result2?.slice(0, 3)?.map((r: any) => ({
          job_id: r.job_id,
          company_name: r.company_name,
          job_title: r.job_title,
          similarity: r.similarity
        }))
      })
    } catch (e) {
      tests.push({
        name: '多めの結果 (match_count=50)',
        success: false,
        error: e,
        result_count: 0
      })
    }
    
    // テスト3: 類似度の分布を確認するため全件
    try {
      const { data: result3, error: error3 } = await supabase
        .rpc('match_jobs_for_candidate', {
          p_candidate_id: candidateId,
          p_session_id: sessionId,
          match_count: 1000
        })
      
      const similarities = result3?.map((r: any) => r.similarity) || []
      const maxSim = similarities.length > 0 ? Math.max(...similarities) : 0
      const minSim = similarities.length > 0 ? Math.min(...similarities) : 0
      const avgSim = similarities.length > 0 ? similarities.reduce((a: number, b: number) => a + b, 0) / similarities.length : 0
      
      tests.push({
        name: '全件検索 (match_count=1000)',
        success: !error3,
        result_count: result3?.length || 0,
        error: error3,
        similarity_stats: {
          max: maxSim,
          min: minSim,
          average: avgSim,
          count_above_06: similarities.filter((s: number) => s >= 0.6).length,
          count_above_05: similarities.filter((s: number) => s >= 0.5).length,
          count_above_04: similarities.filter((s: number) => s >= 0.4).length
        },
        top_matches: result3?.slice(0, 5)?.map((r: any) => ({
          job_id: r.job_id,
          company_name: r.company_name,
          job_title: r.job_title,
          similarity: r.similarity
        }))
      })
    } catch (e) {
      tests.push({
        name: '全件検索 (match_count=1000)',
        success: false,
        error: e,
        result_count: 0
      })
    }
    
    // 4. 手動で簡単なベクトル検索を試す
    try {
      const { data: profile } = await supabase
        .from('candidates')
        .select('profile_embedding')
        .eq('id', candidateId)
        .single()
        
      if (profile?.profile_embedding) {
        const { data: simpleSearch, error: simpleError } = await supabase
          .from('jobs')
          .select('id, company_name, job_title, embedding')
          .eq('is_active', true)
          .not('embedding', 'is', null)
          .limit(10)
          
        tests.push({
          name: '手動簡単検索',
          success: !simpleError,
          result_count: simpleSearch?.length || 0,
          error: simpleError,
          note: 'PostgreSQL関数を使わずに直接jobs表から取得'
        })
      }
    } catch (e) {
      tests.push({
        name: '手動簡単検索',
        success: false,
        error: e,
        result_count: 0
      })
    }
    
    console.log('PostgreSQL関数テスト結果:', tests)
    
    return NextResponse.json({
      success: true,
      function_tests: tests,
      debug_info: {
        session_id: sessionId,
        candidate_id: candidateId,
        total_tests: tests.length,
        successful_tests: tests.filter(t => t.success).length
      }
    })
    
  } catch (error) {
    console.error('関数テストエラー:', error)
    return NextResponse.json(
      { error: `関数テストに失敗しました: ${error}` },
      { status: 500 }
    )
  }
}