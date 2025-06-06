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
    
    debugLog.log('求人データ調査開始')
    
    // 1. 全求人数をチェック
    const { count: totalJobs, error: totalError } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
    
    // 2. アクティブな求人数をチェック
    const { count: activeJobs, error: activeError } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
    
    // 3. ベクトルデータを持つ求人数をチェック
    const { count: vectorJobs, error: vectorError } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .not('embedding', 'is', null)
    
    // 4. サンプル求人データを取得
    const { data: sampleJobs, error: sampleError } = await supabase
      .from('jobs')
      .select('id, company_name, job_title, is_active, embedding')
      .eq('is_active', true)
      .limit(5)
    
    // 5. 最近の求人を取得
    const { data: recentJobs, error: recentError } = await supabase
      .from('jobs')
      .select('id, company_name, job_title, created_at, is_active, embedding')
      .order('created_at', { ascending: false })
      .limit(3)
    
    debugLog.log('求人データ調査結果:', {
      totalJobs,
      activeJobs,
      vectorJobs,
      sampleJobsCount: sampleJobs?.length,
      recentJobsCount: recentJobs?.length
    })
    
    return NextResponse.json({
      success: true,
      job_data_analysis: {
        counts: {
          total_jobs: totalJobs,
          active_jobs: activeJobs,
          jobs_with_vectors: vectorJobs
        },
        sample_jobs: sampleJobs?.map(job => ({
          id: job.id,
          company: job.company_name,
          title: job.job_title,
          is_active: job.is_active,
          has_embedding: job.embedding != null,
          embedding_length: job.embedding?.length
        })),
        recent_jobs: recentJobs?.map(job => ({
          id: job.id,
          company: job.company_name,
          title: job.job_title,
          created_at: job.created_at,
          is_active: job.is_active,
          has_embedding: job.embedding != null
        })),
        errors: {
          totalError,
          activeError,
          vectorError,
          sampleError,
          recentError
        }
      }
    })
    
  } catch (error) {
    debugLog.error('求人データ調査エラー:', error)
    return NextResponse.json(
      { error: `求人データの調査に失敗しました: ${error}` },
      { status: 500 }
    )
  }
}