import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'

// メッセージの改行文字を診断
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    
    const supabase = getServiceSupabase()
    
    // セッションIDが指定されている場合はそのセッションのメッセージを取得
    const query = supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (sessionId) {
      query.eq('session_id', sessionId)
    }
    
    const { data: messages, error } = await query
    
    if (error) {
      throw error
    }
    
    // メッセージの詳細情報を分析
    const analyzedMessages = messages?.map(msg => ({
      id: msg.id,
      role: msg.role,
      created_at: msg.created_at,
      content_length: msg.content.length,
      contains_newline: msg.content.includes('\n'),
      contains_carriage_return: msg.content.includes('\r'),
      line_count: msg.content.split('\n').length,
      first_100_chars: msg.content.substring(0, 100),
      raw_content_escaped: JSON.stringify(msg.content).substring(0, 200),
      // 改行文字の位置を検出
      newline_positions: [...msg.content.matchAll(/\n/g)].map(match => match.index),
      // Markdownの特殊文字を確認
      contains_markdown: {
        lists: /^[\*\-\+]\s/m.test(msg.content),
        numbered_lists: /^\d+\.\s/m.test(msg.content),
        headers: /^#+\s/m.test(msg.content),
        code_blocks: /```/.test(msg.content),
        inline_code: /`[^`]+`/.test(msg.content),
      }
    }))
    
    return NextResponse.json({
      total_messages: messages?.length || 0,
      session_id: sessionId || 'all recent messages',
      messages: analyzedMessages,
      summary: {
        messages_with_newlines: analyzedMessages?.filter(m => m.contains_newline).length || 0,
        messages_with_markdown: analyzedMessages?.filter(m => 
          Object.values(m.contains_markdown).some(v => v)
        ).length || 0,
        assistant_messages: analyzedMessages?.filter(m => m.role === 'assistant').length || 0,
        user_messages: analyzedMessages?.filter(m => m.role === 'user').length || 0,
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: 'メッセージ診断エラー',
      message: error.message,
      details: error
    }, { status: 500 })
  }
}