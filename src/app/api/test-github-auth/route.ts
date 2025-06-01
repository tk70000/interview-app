import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const isTestMode = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';
  
  return NextResponse.json({
    testMode: isTestMode,
    nodeEnv: process.env.NODE_ENV,
    disableAuth: process.env.NEXT_PUBLIC_DISABLE_AUTH,
    githubClientId: process.env.GITHUB_CLIENT_ID ? 'Set' : 'Not set',
    githubCallbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`,
    message: isTestMode ? 
      'Test mode is enabled. You should be able to access /api/auth/github' : 
      'Test mode is disabled. Real authentication is required.'
  });
}