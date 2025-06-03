import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'
import { checkAdminAuth } from '@/lib/admin-auth'

// データベーススキーマのデバッグ用エンドポイント
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

    const supabase = getServiceSupabase()

    // sessionsテーブルの列情報を取得
    const { data: sessionColumns, error: sessionError } = await supabase
      .rpc('get_table_columns', { table_name: 'sessions' })

    // 代替方法: information_schemaから直接取得
    const { data: schemaInfo, error: schemaError } = await supabase
      .from('information_schema.columns' as any)
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'sessions')
      .eq('table_schema', 'public')

    // サンプルセッションを取得（エラーが出ても情報を収集）
    let sampleSession = null
    let sampleError = null
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .limit(1)
        .single()
      
      sampleSession = data
      sampleError = error
    } catch (e) {
      sampleError = e
    }

    // admin_noteカラムの存在確認
    let adminNoteCheck = null
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, admin_note')
        .limit(1)
      
      adminNoteCheck = { success: true, data, error }
    } catch (e) {
      adminNoteCheck = { success: false, error: e }
    }

    // セッション数の確認
    const { count: sessionCount } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })

    // メッセージテーブルの確認
    const { data: messagesSample, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .limit(1)

    return NextResponse.json({
      debug: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
      },
      sessions: {
        columns: {
          fromRpc: sessionColumns,
          fromInformationSchema: schemaInfo,
          rpcError: sessionError,
          schemaError: schemaError,
        },
        sample: {
          data: sampleSession,
          error: sampleError,
        },
        adminNoteCheck,
        count: sessionCount,
      },
      messages: {
        sample: messagesSample,
        error: messagesError,
      },
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    })

  } catch (error: any) {
    console.error('スキーマデバッグエラー:', error)
    return NextResponse.json(
      { 
        error: 'スキーマ情報の取得に失敗しました',
        details: error.message,
        stack: error.stack
      },
      { status: 500 }
    )
  }
}

// RPC関数が存在しない場合のフォールバック
// Supabaseで以下のSQL関数を実行してください：
/*
CREATE OR REPLACE FUNCTION get_table_columns(table_name text)
RETURNS TABLE(column_name text, data_type text, is_nullable text)
LANGUAGE sql
AS $$
  SELECT 
    column_name::text,
    data_type::text,
    is_nullable::text
  FROM information_schema.columns
  WHERE table_name = $1
  AND table_schema = 'public'
  ORDER BY ordinal_position;
$$;
*/