import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { github_token, github_username } = body;
    
    if (!github_token || !github_username) {
      return NextResponse.json({ 
        error: 'Missing required fields: github_token, github_username' 
      }, { status: 400 });
    }
    
    const supabase = getServiceSupabase();
    const userId = '00000000-0000-0000-0000-000000000000';
    
    // 既存の接続を削除
    await supabase
      .from('github_connections')
      .delete()
      .eq('user_id', userId);
    
    // 新しい接続を作成
    const { data, error } = await supabase
      .from('github_connections')
      .insert({
        user_id: userId,
        github_token: github_token,
        github_username: github_username,
        scopes: ['repo', 'workflow'],
        expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating GitHub connection:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'GitHub connection created successfully',
      data: {
        id: data.id,
        github_username: data.github_username,
        scopes: data.scopes
      }
    });
  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}