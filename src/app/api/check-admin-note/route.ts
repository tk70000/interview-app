import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'

// admin_noteカラムの存在を確認する専用エンドポイント
export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceSupabase()
    
    const results: any = {
      timestamp: new Date().toISOString(),
      tests: []
    }

    // テスト1: sessionsテーブルから全カラムを取得
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .limit(1)
        .single()
      
      if (data) {
        results.tests.push({
          name: 'Select all columns',
          success: true,
          columns: Object.keys(data),
          hasAdminNote: 'admin_note' in data,
          hasAdminUpdatedAt: 'admin_updated_at' in data,
          sampleData: data
        })
      } else {
        results.tests.push({
          name: 'Select all columns',
          success: false,
          error: error?.message || 'No data found'
        })
      }
    } catch (e: any) {
      results.tests.push({
        name: 'Select all columns',
        success: false,
        error: e.message
      })
    }

    // テスト1.5: 明示的に全カラムを指定
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, candidate_id, status, started_at, ended_at, summary, admin_note, admin_updated_at')
        .limit(1)
        .single()
      
      if (data) {
        results.tests.push({
          name: 'Select all columns explicitly',
          success: true,
          columns: Object.keys(data),
          hasAdminNote: 'admin_note' in data,
          hasAdminUpdatedAt: 'admin_updated_at' in data,
          adminNoteValue: data.admin_note,
          adminUpdatedAtValue: data.admin_updated_at
        })
      } else {
        results.tests.push({
          name: 'Select all columns explicitly',
          success: false,
          error: error?.message || 'No data found'
        })
      }
    } catch (e: any) {
      results.tests.push({
        name: 'Select all columns explicitly',
        success: false,
        error: e.message
      })
    }

    // テスト2: admin_noteを明示的に選択
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, admin_note')
        .limit(1)
      
      results.tests.push({
        name: 'Select admin_note explicitly',
        success: !error,
        data: data,
        error: error?.message
      })
    } catch (e: any) {
      results.tests.push({
        name: 'Select admin_note explicitly',
        success: false,
        error: e.message
      })
    }

    // テスト3: 基本カラムのみを選択
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, candidate_id, status, started_at, ended_at, summary')
        .limit(1)
      
      results.tests.push({
        name: 'Select basic columns only',
        success: !error,
        data: data,
        error: error?.message
      })
    } catch (e: any) {
      results.tests.push({
        name: 'Select basic columns only',
        success: false,
        error: e.message
      })
    }

    // テスト4: テーブル定義を確認（PostgreSQLの情報スキーマ）
    try {
      const { data, error } = await supabase.rpc('get_sessions_columns')
      
      if (!error && data) {
        results.tests.push({
          name: 'Get table schema via RPC',
          success: true,
          columns: data
        })
      } else {
        // RPC関数が存在しない場合のフォールバック
        results.tests.push({
          name: 'Get table schema via RPC',
          success: false,
          error: error?.message || 'RPC function not found',
          hint: 'RPC function get_sessions_columns does not exist'
        })
      }
    } catch (e: any) {
      results.tests.push({
        name: 'Get table schema via RPC',
        success: false,
        error: e.message
      })
    }

    // テスト5: SQLエディタで実行すべきクエリの提供
    results.sqlToCheck = {
      checkColumns: `
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'sessions' 
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `,
      checkAdminNote: `
        SELECT COUNT(*) as has_admin_note
        FROM information_schema.columns 
        WHERE table_name = 'sessions' 
        AND column_name = 'admin_note'
        AND table_schema = 'public';
      `,
      addAdminNoteIfMissing: `
        -- もしadmin_noteカラムが存在しない場合は以下を実行:
        ALTER TABLE public.sessions 
        ADD COLUMN IF NOT EXISTS admin_note TEXT;
        
        ALTER TABLE public.sessions 
        ADD COLUMN IF NOT EXISTS admin_updated_at TIMESTAMP WITH TIME ZONE;
      `
    }

    // 結論
    const hasAdminNote = results.tests.some((test: any) => 
      test.name === 'Select all columns' && test.hasAdminNote === true
    )
    
    results.conclusion = {
      adminNoteExists: hasAdminNote,
      recommendation: hasAdminNote 
        ? '管理画面でのエラーは、カラムは存在するが権限の問題かもしれません。'
        : 'admin_noteカラムが見つかりません。上記のSQLを実行してカラムを追加してください。'
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
      error: 'チェックエラー',
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

// Supabaseで実行するRPC関数
const CREATE_RPC = `
CREATE OR REPLACE FUNCTION get_sessions_columns()
RETURNS TABLE(column_name text, data_type text, is_nullable text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    column_name::text,
    data_type::text,
    is_nullable::text
  FROM information_schema.columns
  WHERE table_name = 'sessions'
  AND table_schema = 'public'
  ORDER BY ordinal_position;
$$;
`