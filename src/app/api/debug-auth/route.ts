import { NextRequest, NextResponse } from 'next/server';
import { createClient, getServiceSupabase } from '@/lib/supabase-server';
import { productionGuard } from '@/lib/debug-guard';

export async function GET(request: NextRequest) {
  // 本番環境でのアクセスを制限
  const guard = productionGuard()
  if (guard) return guard
  const isTestMode = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';
  
  let authInfo: any = {
    testMode: isTestMode,
    nodeEnv: process.env.NODE_ENV,
    disableAuth: process.env.NEXT_PUBLIC_DISABLE_AUTH,
  };

  try {
    if (!isTestMode) {
      const supabase = await createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      authInfo.realAuth = {
        authenticated: !!user,
        userId: user?.id,
        email: user?.email,
        error: error?.message
      };
    } else {
      authInfo.testAuth = {
        mode: 'Test mode active',
        testUserId: '00000000-0000-0000-0000-000000000000'
      };
    }

    // GitHub接続の確認
    const supabase = isTestMode ? getServiceSupabase() : await createClient();
    const userId = isTestMode ? '00000000-0000-0000-0000-000000000000' : authInfo.realAuth?.userId;
    
    if (userId) {
      const { data: connection, error } = await supabase
        .from('github_connections')
        .select('id, user_id, github_username, scopes, created_at')
        .eq('user_id', userId)
        .single();
      
      authInfo.githubConnection = {
        connected: !!connection,
        data: connection,
        error: error?.message
      };
    }
  } catch (error: any) {
    authInfo.error = error.message;
  }

  return NextResponse.json(authInfo, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    }
  });
}