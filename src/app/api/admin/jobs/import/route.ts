import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { extractJobPostingText } from '@/lib/server-utils'
import { parseFileNameInfo, parseJobContent, generateJobEmbedding } from '@/lib/job-parser'
import { getErrorMessage } from '@/lib/utils'

// 求人情報のインポートAPI
export async function POST(request: NextRequest) {
  try {
    // 管理者認証チェック
    const adminAuth = checkAdminAuth(request)
    if (!adminAuth.isAdmin) {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが指定されていません' },
        { status: 400 }
      )
    }

    // ファイル形式チェック
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'PDF、DOCX、またはTXTファイルのみ対応しています' },
        { status: 400 }
      )
    }

    // ファイル名から基本情報を抽出
    const fileNameInfo = parseFileNameInfo(file.name)
    
    // ファイル内容を抽出
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const rawContent = await extractJobPostingText(fileBuffer, file.name, file.type)
    
    if (!rawContent || rawContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'ファイルからテキストを抽出できませんでした' },
        { status: 400 }
      )
    }

    // 求人情報を構造化
    const parsedData = await parseJobContent(rawContent, fileNameInfo)
    
    // ベクトル埋め込みを生成
    const embedding = await generateJobEmbedding(parsedData)
    
    // データベースに保存
    const supabase = getServiceSupabase()
    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        company_name: parsedData.company_name,
        job_title: parsedData.job_title,
        department: parsedData.department,
        job_description: parsedData.job_description,
        requirements: parsedData.requirements,
        skills: parsedData.skills || [],
        employment_type: parsedData.employment_type,
        location: parsedData.location,
        salary_range: parsedData.salary_range,
        file_name: file.name,
        raw_content: rawContent,
        parsed_data: parsedData,
        embedding,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('求人情報の保存エラー:', error)
      return NextResponse.json(
        { error: '求人情報の保存に失敗しました', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        company_name: job.company_name,
        job_title: job.job_title,
        department: job.department,
        skills: job.skills
      },
      message: `求人情報「${job.company_name} - ${job.job_title}」を登録しました`
    })

  } catch (error) {
    console.error('求人インポートエラー:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}

// 求人一覧取得API
export async function GET(request: NextRequest) {
  try {
    // 管理者認証チェック
    const adminAuth = checkAdminAuth(request)
    if (!adminAuth.isAdmin) {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const search = searchParams.get('search') || ''
    
    const supabase = getServiceSupabase()
    const offset = (page - 1) * limit

    // クエリ構築
    let query = supabase
      .from('jobs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // 検索条件
    if (search) {
      query = query.or(`company_name.ilike.%${search}%,job_title.ilike.%${search}%`)
    }

    // ページネーション
    query = query.range(offset, offset + limit - 1)

    const { data: jobs, error, count } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      jobs: jobs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('求人一覧取得エラー:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}