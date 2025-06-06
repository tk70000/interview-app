import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { getRateLimiter, RATE_LIMITS } from '@/lib/rate-limit'

// 🧪 テスト環境フラグ - 本番では false に設定してください
// 注意: ミドルウェアでは process.env.DISABLE_AUTH が読み込めない可能性があるため、
// 開発環境では常に認証を無効化
const IS_TEST_MODE = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production'

// 認証が必要なパス
const protectedPaths = [
  '/api/v1/chat',
  '/api/v1/cv',
  '/api/v1/dashboard',
  // テストモードでは認証をスキップ
  ...(IS_TEST_MODE ? [] : ['/chat', '/dashboard', '/upload']),
]

// 管理者権限が必要なパス
const adminPaths = [
  '/admin',
  '/api/admin',
]

// 公開パス（認証不要）
const publicPaths = [
  '/',
  '/api/health',
  // テストモードでは以下も公開
  ...(IS_TEST_MODE ? ['/upload', '/chat', '/dashboard'] : []),
]

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })
  
  const pathname = request.nextUrl.pathname
  
  // テストモード表示
  if (IS_TEST_MODE && pathname === '/') {
    console.log('🧪 TEST MODE: 認証チェックが無効化されています')
  }
  
  // レート制限のチェック
  if (pathname.startsWith('/api/')) {
    // IPアドレスまたはユーザーIDを識別子として使用
    const identifier = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous'
    
    // パスに応じたレート制限を適用
    let rateLimitConfig = RATE_LIMITS.api
    if (pathname.includes('/chat/')) {
      rateLimitConfig = RATE_LIMITS.chat
    } else if (pathname.includes('/cv')) {
      rateLimitConfig = RATE_LIMITS.upload
    } else if (pathname.includes('/dashboard')) {
      rateLimitConfig = RATE_LIMITS.dashboard
    }
    
    const limiter = getRateLimiter(pathname.split('/')[3] || 'api', {
      interval: rateLimitConfig.window,
      uniqueTokenPerInterval: 500,
    })
    
    const rateLimitResult = await limiter.check(identifier, rateLimitConfig.limit)
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'リクエスト数が制限を超えました。しばらく待ってから再試行してください。',
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          reset: rateLimitResult.reset,
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toISOString(),
          }
        }
      )
    }
    
    // レート制限情報をレスポンスヘッダーに追加
    res.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString())
    res.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
    res.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toISOString())
  }
  
  // 管理者パスかチェック
  const isAdminPath = adminPaths.some(path => pathname.startsWith(path))
  
  // 管理者パスの場合は特別な処理
  if (isAdminPath) {
    // 開発環境では管理者認証をスキップ
    if (IS_TEST_MODE) {
      console.log('🧪 ADMIN MODE: 管理者認証がスキップされています')
      return res
    }
    
    // 管理者認証チェック（簡易版）
    const adminSecret = request.headers.get('x-admin-secret')
    const allowedAdminSecret = process.env.ADMIN_SECRET
    
    if (!adminSecret || !allowedAdminSecret || adminSecret !== allowedAdminSecret) {
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json(
          { error: '管理者権限が必要です' },
          { status: 403 }
        )
      }
      
      // 管理者ページの場合はホームにリダイレクト
      return NextResponse.redirect(new URL('/', request.url))
    }
    
    return res
  }
  
  // 保護されたパスかチェック
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
  
  if (isProtectedPath && !IS_TEST_MODE) {
    // セッションを確認
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session) {
      // APIルートの場合は401を返す
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: '認証が必要です' },
          { status: 401 }
        )
      }
      
      // ページの場合はログインページにリダイレクト
      const redirectUrl = new URL('/', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }
    
    // APIルートの場合、追加のセキュリティチェック
    if (pathname.startsWith('/api/')) {
      // セッションIDやcandidateIDのアクセス権限をチェック
      if (pathname.includes('/chat/') || pathname.includes('/candidates/')) {
        const resourceId = pathname.split('/').pop()
        
        // リソースの所有権を確認
        const { data: resource } = await supabase
          .from(pathname.includes('/chat/') ? 'sessions' : 'candidates')
          .select('*')
          .eq('id', resourceId)
          .single()
        
        if (!resource || resource.user_id !== session.user.id) {
          return NextResponse.json(
            { error: 'アクセス権限がありません' },
            { status: 403 }
          )
        }
      }
    }
  }
  
  // CORS ヘッダーを設定
  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin')
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
    
    if (origin && allowedOrigins.includes(origin)) {
      res.headers.set('Access-Control-Allow-Origin', origin)
      res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      res.headers.set('Access-Control-Max-Age', '86400')
    }
    
    // Preflight リクエストの処理
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: res.headers })
    }
  }
  
  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}