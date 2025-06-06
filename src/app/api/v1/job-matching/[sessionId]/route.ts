import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'
import { matchJobsForSession, generateDetailedMatchExplanation } from '@/lib/job-matcher'
import { getErrorMessage } from '@/lib/utils'

// 求人マッチングを実行
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  
  if (!sessionId) {
    return NextResponse.json(
      { error: 'セッションIDが必要です' },
      { status: 400 }
    )
  }

  try {
    const body = await request.json()
    const { matchCount = 5, minSimilarity = 0.0, includeExplanations = false } = body
    
    // マッチング実行
    const matchingResult = await matchJobsForSession(
      sessionId,
      matchCount,
      minSimilarity
    )
    
    // 詳細説明を含める場合
    if (includeExplanations && matchingResult.matches.length > 0) {
      const supabase = getServiceSupabase()
      
      // セッションと候補者情報を取得
      const { data: session } = await supabase
        .from('sessions')
        .select(`
          *,
          candidates (*)
        `)
        .eq('id', sessionId)
        .single()
        
      // 上位5件に詳細説明を追加
      const topMatches = matchingResult.matches.slice(0, 5)
      
      for (const match of topMatches) {
        const { data: job } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', match.job_id)
          .single()
          
        if (job && session) {
          const explanation = await generateDetailedMatchExplanation(
            job,
            session.candidates,
            session
          )
          ;(match as any).detailed_explanation = explanation
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      ...matchingResult
    })
    
  } catch (error) {
    console.error('求人マッチングエラー:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}

// マッチング結果を取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  
  if (!sessionId) {
    return NextResponse.json(
      { error: 'セッションIDが必要です' },
      { status: 400 }
    )
  }

  try {
    const supabase = getServiceSupabase()
    
    // 保存されているマッチング結果を取得
    const { data: matches, error } = await supabase
      .from('job_matches')
      .select(`
        *,
        jobs (
          id,
          company_name,
          job_title,
          department,
          job_description,
          requirements,
          skills,
          employment_type,
          location,
          salary_range,
          parsed_data
        )
      `)
      .eq('session_id', sessionId)
      .order('ranking', { ascending: true })
      
    if (error) {
      throw error
    }
    
    // レスポンス形式に整形
    const formattedMatches = matches?.map(match => ({
      job_id: match.job_id,
      company_name: match.jobs.company_name,
      job_title: match.jobs.job_title,
      department: match.jobs.department,
      job_description: match.jobs.job_description,
      requirements: match.jobs.requirements,
      skills: match.jobs.skills,
      employment_type: match.jobs.employment_type,
      location: match.jobs.location,
      salary_range: match.jobs.salary_range,
      similarity: match.similarity_score,
      match_reason: match.match_reason,
      ranking: match.ranking,
      created_at: match.created_at
    })) || []
    
    return NextResponse.json({
      success: true,
      matches: formattedMatches,
      total_found: formattedMatches.length,
      session_id: sessionId
    })
    
  } catch (error) {
    console.error('マッチング結果取得エラー:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}