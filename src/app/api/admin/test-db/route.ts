import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'

// シンプルなデータベース接続テスト
export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceSupabase()
    
    // 1. 基本的なテーブル一覧を取得
    const tables = ['sessions', 'candidates', 'messages']
    const results: any = {}
    
    for (const table of tables) {
      try {
        // シンプルなカウントクエリ
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        
        results[table] = {
          exists: !error,
          count: count || 0,
          error: error?.message
        }
      } catch (e: any) {
        results[table] = {
          exists: false,
          error: e.message
        }
      }
    }
    
    // 2. sessionsテーブルの構造を取得（別の方法）
    let sessionStructure = null
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .limit(0) // データは取得せず、構造だけ確認
      
      if (!error) {
        // 空の結果でも列情報は取得できる場合がある
        sessionStructure = 'Query succeeded (structure exists)'
      } else {
        sessionStructure = `Query failed: ${error.message}`
      }
    } catch (e: any) {
      sessionStructure = `Exception: ${e.message}`
    }
    
    // 3. admin_noteを含まないクエリテスト
    let basicQueryTest = null
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, started_at, status')
        .limit(1)
      
      basicQueryTest = {
        success: !error,
        data: data,
        error: error?.message
      }
    } catch (e: any) {
      basicQueryTest = {
        success: false,
        error: e.message
      }
    }
    
    // 4. 環境変数の確認（機密情報は隠す）
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      SERVICE_KEY_EXISTS: !!process.env.SERVICE_KEY,
      SUPABASE_SERVICE_ROLE_KEY_EXISTS: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NODE_ENV: process.env.NODE_ENV
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      tables: results,
      sessionStructure,
      basicQueryTest,
      environment: envCheck,
      recommendation: 'マイグレーションが適用されているか、Supabase管理画面で確認してください。'
    })
    
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'データベーステストエラー',
        message: error.message,
        stack: error.stack
      },
      { status: 500 }
    )
  }
}