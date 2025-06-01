import { NextRequest, NextResponse } from 'next/server';
import { createClient, getServiceSupabase } from '@/lib/supabase-server';
import { exchangeCodeForToken } from '@/lib/github';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  
  if (!code || !state) {
    return NextResponse.redirect(new URL('/auth/signin?error=missing_params', request.url));
  }
  
  try {
    const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
    const { userId, returnTo } = decodedState;
    
    // 開発環境でのテストモード
    const isTestMode = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';
    
    if (!isTestMode) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || user.id !== userId) {
        return NextResponse.redirect(new URL('/auth/signin?error=unauthorized', request.url));
      }
    }
    
    const tokenData = await exchangeCodeForToken(code);
    console.log('Token exchange successful:', { 
      hasToken: !!tokenData.token,
      scopes: tokenData.scopes,
      userId 
    });
    
    // Supabaseクライアントの作成（テストモードでも必要）
    const supabase = isTestMode ? getServiceSupabase() : await createClient();
    
    const { error: upsertError } = await supabase
      .from('github_connections')
      .upsert({
        user_id: userId,
        github_token: tokenData.token,
        github_username: tokenData.scopes.includes('read:user') ? 
          await getGitHubUsername(tokenData.token) : null,
        scopes: tokenData.scopes,
        expires_at: null, // OAuth tokens don't expire
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });
    
    if (upsertError) {
      console.error('Error saving GitHub connection:', {
        error: upsertError,
        userId,
        table: 'github_connections',
        isTestMode
      });
      return NextResponse.redirect(new URL('/dashboard?error=connection_failed&details=' + encodeURIComponent(upsertError.message), request.url));
    }
    
    return NextResponse.redirect(new URL(returnTo + '?github=connected', request.url));
  } catch (error) {
    console.error('GitHub OAuth callback error:', error);
    return NextResponse.redirect(new URL('/dashboard?error=oauth_failed', request.url));
  }
}

async function getGitHubUsername(token: string): Promise<string | null> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.login;
  } catch (error) {
    console.error('Error fetching GitHub username:', error);
    return null;
  }
}