import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

const GITHUB_OAUTH_URL = 'https://github.com/login/oauth/authorize';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const returnTo = searchParams.get('returnTo') || '/dashboard';
  
  // 開発環境でのテストモード
  const isTestMode = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';
  
  let userId: string | null = null;
  
  if (!isTestMode) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }
    userId = user.id;
  } else {
    // テストモードでは固定のUUIDを使用
    userId = '00000000-0000-0000-0000-000000000000';
  }
  
  const state = Buffer.from(JSON.stringify({
    userId: userId,
    returnTo,
    timestamp: Date.now(),
  })).toString('base64');
  
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`,
    scope: 'repo read:user workflow',
    state,
  });
  
  return NextResponse.redirect(`${GITHUB_OAUTH_URL}?${params.toString()}`);
}