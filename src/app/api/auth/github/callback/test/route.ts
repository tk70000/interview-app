import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  
  // GitHubからのエラーレスポンスをチェック
  if (error) {
    return NextResponse.json({
      error: 'GitHub OAuth Error',
      errorCode: error,
      errorDescription: errorDescription,
      message: 'GitHub authentication was denied or failed'
    }, { status: 400 });
  }
  
  // パラメータの検証
  if (!code || !state) {
    return NextResponse.json({
      error: 'Missing parameters',
      hasCode: !!code,
      hasState: !!state,
      message: 'OAuth callback is missing required parameters'
    }, { status: 400 });
  }
  
  // stateのデコード
  let decodedState;
  try {
    decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
  } catch (e) {
    return NextResponse.json({
      error: 'Invalid state parameter',
      message: 'Could not decode state parameter'
    }, { status: 400 });
  }
  
  return NextResponse.json({
    success: true,
    message: 'OAuth callback received successfully',
    data: {
      codeLength: code.length,
      state: decodedState,
      timestamp: new Date().toISOString()
    }
  });
}