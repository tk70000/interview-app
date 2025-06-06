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
    
    // sessionsテーブルの構造を確認（関数が存在しない場合はスキップ）
    let schemaData = null
    let schemaError = null
    try {
      const result = await supabase.rpc('get_table_schema', { table_name: 'sessions' })
      schemaData = result.data
      schemaError = result.error
    } catch (e) {
      schemaError = e
    }
    
    // 代替方法：実際のセッションデータを1件取得してカラム構造を確認
    const { data: sampleSession, error: sampleError } = await supabase
      .from('sessions')
      .select('*')
      .limit(1)
      .single()
    
    // 利用可能なカラム情報
    const availableColumns = sampleSession ? Object.keys(sampleSession) : []
    
    return NextResponse.json({
      success: true,
      schema: schemaData || 'スキーマ取得不可',
      sampleSession,
      availableColumns,
      errors: {
        schemaError,
        sampleError
      }
    })
    
  } catch (error) {
    debugLog.error('スキーマ確認エラー:', error)
    return NextResponse.json(
      { error: `スキーマの確認に失敗しました: ${error}` },
      { status: 500 }
    )
  }
}