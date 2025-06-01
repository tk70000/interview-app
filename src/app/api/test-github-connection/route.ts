import { NextRequest, NextResponse } from 'next/server';
import { createClient, getServiceSupabase } from '@/lib/supabase-server';
import { getUserRepositories } from '@/lib/github';

export async function GET(request: NextRequest) {
  try {
    const isTestMode = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';
    const supabase = isTestMode ? getServiceSupabase() : await createClient();
    
    // テストモードでは固定のユーザーID
    const userId = isTestMode ? 'test-user-id' : null;
    
    // GitHub接続情報を取得
    const { data: connection, error } = await supabase
      .from('github_connections')
      .select('*')
      .eq('user_id', userId || '')
      .single();
    
    if (error || !connection) {
      return NextResponse.json({
        connected: false,
        message: 'GitHub is not connected',
        error: error?.message
      });
    }
    
    // リポジトリ一覧を取得してみる
    let repoCount = 0;
    let repoNames: string[] = [];
    
    try {
      const repos = await getUserRepositories(connection.github_token);
      repoCount = repos.length;
      repoNames = repos.slice(0, 5).map(r => r.name); // 最初の5個だけ
    } catch (repoError) {
      console.error('Error fetching repos:', repoError);
    }
    
    return NextResponse.json({
      connected: true,
      connection: {
        id: connection.id,
        userId: connection.user_id,
        githubUsername: connection.github_username,
        scopes: connection.scopes,
        createdAt: connection.created_at,
        updatedAt: connection.updated_at,
      },
      repositories: {
        count: repoCount,
        sample: repoNames
      },
      message: 'GitHub connection is active!'
    });
  } catch (error) {
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}