import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { getErrorMessage } from '@/lib/utils'

// 求人の詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params
  
  if (!jobId) {
    return NextResponse.json(
      { error: '求人IDが必要です' },
      { status: 400 }
    )
  }

  try {
    // 管理者認証チェック
    const adminAuth = checkAdminAuth(request)
    if (!adminAuth.isAdmin) {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      )
    }

    const supabase = getServiceSupabase()
    
    const { data: job, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single()
      
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: '求人が見つかりません' },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      job
    })
    
  } catch (error) {
    console.error('求人詳細取得エラー:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}

// 求人の更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params
  
  if (!jobId) {
    return NextResponse.json(
      { error: '求人IDが必要です' },
      { status: 400 }
    )
  }

  try {
    // 管理者認証チェック
    const adminAuth = checkAdminAuth(request)
    if (!adminAuth.isAdmin) {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const supabase = getServiceSupabase()
    
    // 更新可能なフィールドのみを抽出
    const allowedFields = [
      'company_name',
      'job_title', 
      'department',
      'job_description',
      'requirements',
      'skills',
      'employment_type',
      'location',
      'salary_range',
      'is_active'
    ]
    
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    
    // 許可されたフィールドのみを更新データに追加
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field]
      }
    }
    
    const { data: job, error } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId)
      .select()
      .single()
      
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: '求人が見つかりません' },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      job,
      message: '求人情報を更新しました'
    })
    
  } catch (error) {
    console.error('求人更新エラー:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}

// 求人の削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params
  
  if (!jobId) {
    return NextResponse.json(
      { error: '求人IDが必要です' },
      { status: 400 }
    )
  }

  try {
    // 管理者認証チェック
    const adminAuth = checkAdminAuth(request)
    if (!adminAuth.isAdmin) {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      )
    }

    const supabase = getServiceSupabase()
    
    // 関連するマッチング履歴も削除
    await supabase
      .from('job_matches')
      .delete()
      .eq('job_id', jobId)
    
    // 求人を削除
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', jobId)
      
    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: '求人を削除しました'
    })
    
  } catch (error) {
    console.error('求人削除エラー:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}