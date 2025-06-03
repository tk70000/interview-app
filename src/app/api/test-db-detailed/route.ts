import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'

// 詳細なデータベーステスト
export async function GET(request: NextRequest) {
  try {
    const results: any = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        SERVICE_KEY_EXISTS: !!process.env.SERVICE_KEY,
        SUPABASE_SERVICE_ROLE_KEY_EXISTS: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        SUPABASE_ANON_KEY_EXISTS: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      }
    }

    // 1. Anonキーでの接続テスト
    try {
      const anonClient = await createClient()
      
      // 認証状態の確認
      const { data: { session }, error: sessionError } = await anonClient.auth.getSession()
      results.anonClient = {
        connected: true,
        sessionExists: !!session,
        sessionError: sessionError?.message,
        user: session?.user?.email
      }

      // publicテーブルへのアクセステスト
      const { data: anonSessions, error: anonSessionsError } = await anonClient
        .from('sessions')
        .select('id')
        .limit(1)
      
      results.anonClient.sessionsAccess = {
        canAccess: !anonSessionsError,
        error: anonSessionsError?.message
      }
    } catch (e: any) {
      results.anonClient = {
        connected: false,
        error: e.message
      }
    }

    // 2. Service Role Keyでの接続テスト
    try {
      const serviceKey = process.env.SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!serviceKey) {
        results.serviceClient = {
          connected: false,
          error: 'No service key found in environment variables'
        }
      } else {
        const serviceClient = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceKey
        )

        // テーブル構造の詳細取得
        results.serviceClient = {
          connected: true
        }

        // sessionsテーブルの列情報を直接SQLで取得
        let columnsData = null
        let columnsError = null
        try {
          const result = await serviceClient
            .rpc('get_column_info', { 
              schema_name: 'public',
              table_name: 'sessions'
            })
          columnsData = result.data
          columnsError = result.error
        } catch (e) {
          columnsError = e
        }

        // RPC関数が存在しない場合は別の方法で試行
        if (columnsError || !columnsData) {
          // 直接SQLクエリを実行
          const { data: directQuery, error: directError } = await serviceClient
            .from('sessions')
            .select()
            .limit(0) // メタデータのみ取得
          
          results.serviceClient.columnsMethod = 'limit0Query'
          results.serviceClient.columnsError = directError?.message
          
          // 実際のデータを1件取得して列を確認
          if (!directError) {
            const { data: sampleData, error: sampleError } = await serviceClient
              .from('sessions')
              .select('*')
              .limit(1)
              .single()
            
            if (sampleData) {
              results.serviceClient.detectedColumns = Object.keys(sampleData)
              results.serviceClient.sampleData = {
                hasAdminNote: 'admin_note' in sampleData,
                columns: Object.keys(sampleData)
              }
            } else {
              results.serviceClient.sampleError = sampleError?.message
            }
          }
        } else {
          results.serviceClient.columnsMethod = 'rpc'
          results.serviceClient.columns = columnsData
        }

        // 各テーブルの存在確認とレコード数
        const tables = ['sessions', 'candidates', 'messages', 'cv_uploads']
        results.tables = {}
        
        for (const table of tables) {
          try {
            const { count, error } = await serviceClient
              .from(table)
              .select('*', { count: 'exact', head: true })
            
            results.tables[table] = {
              exists: !error,
              count: count || 0,
              error: error?.message
            }
          } catch (e: any) {
            results.tables[table] = {
              exists: false,
              error: e.message
            }
          }
        }

        // admin_noteカラムの特定テスト
        try {
          const { data, error } = await serviceClient
            .from('sessions')
            .select('id, admin_note')
            .limit(1)
          
          results.adminNoteTest = {
            success: !error,
            hasData: !!data,
            error: error?.message,
            errorDetails: error
          }
        } catch (e: any) {
          results.adminNoteTest = {
            success: false,
            error: e.message,
            errorType: e.constructor.name
          }
        }

        // マイグレーション履歴の確認（Supabaseのマイグレーションテーブルがある場合）
        try {
          const { data: migrations, error: migError } = await serviceClient
            .from('supabase_migrations')
            .select('name, executed_at')
            .order('executed_at', { ascending: false })
            .limit(10)
          
          if (!migError && migrations) {
            results.migrations = {
              found: true,
              recent: migrations
            }
          }
        } catch (e) {
          // マイグレーションテーブルが存在しない場合
          results.migrations = {
            found: false,
            note: 'Migration table not accessible'
          }
        }
      }
    } catch (e: any) {
      results.serviceClient = {
        connected: false,
        error: e.message,
        stack: e.stack
      }
    }

    // 3. 推奨事項の生成
    results.recommendations = []
    
    if (!results.serviceClient?.connected) {
      results.recommendations.push('サービスキーが設定されていません。環境変数を確認してください。')
    }
    
    if (results.adminNoteTest && !results.adminNoteTest.success) {
      if (results.adminNoteTest.error?.includes('column')) {
        results.recommendations.push('admin_noteカラムが存在しません。マイグレーション005_add_interview_availability.sqlを実行してください。')
      } else {
        results.recommendations.push(`admin_noteカラムへのアクセスエラー: ${results.adminNoteTest.error}`)
      }
    }
    
    if (results.serviceClient?.sampleData?.hasAdminNote === false) {
      results.recommendations.push('セッションデータにadmin_noteカラムが見つかりません。データベーススキーマを確認してください。')
    }

    // 4. 接続URLの確認
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (supabaseUrl) {
      try {
        const url = new URL(supabaseUrl)
        results.supabaseConnection = {
          url: supabaseUrl,
          host: url.host,
          protocol: url.protocol,
          projectRef: url.host.split('.')[0]
        }
      } catch (e) {
        results.supabaseConnection = {
          error: 'Invalid Supabase URL format'
        }
      }
    }

    return NextResponse.json(results, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    })

  } catch (error: any) {
    return NextResponse.json({
      error: '詳細テストエラー',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// RPC関数作成用のSQL（参考）
const CREATE_RPC_FUNCTION = `
CREATE OR REPLACE FUNCTION get_column_info(schema_name text, table_name text)
RETURNS TABLE(
  column_name text,
  data_type text,
  is_nullable text,
  column_default text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    column_name::text,
    data_type::text,
    is_nullable::text,
    column_default::text
  FROM information_schema.columns
  WHERE table_schema = schema_name
  AND table_name = table_name
  ORDER BY ordinal_position;
$$;
`