// 環境変数の型定義と検証
export interface Env {
  OPENAI_API_KEY: string
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SERVICE_KEY?: string
  CRON_SECRET?: string
  ALLOWED_ORIGINS?: string
  NODE_ENV?: string
  NEXT_PUBLIC_APP_URL?: string
  SESSION_TIMEOUT_MINUTES?: string
  ADMIN_SECRET?: string
  ADMIN_EMAILS?: string
}

// 環境変数の検証
export function validateEnv(): Env {
  // クライアント側では一部の環境変数のみチェック
  const isServer = typeof window === 'undefined'
  
  const requiredEnvVars = {
    // OpenAI APIキーはサーバー側でのみ必要
    OPENAI_API_KEY: isServer ? process.env.OPENAI_API_KEY : 'client-side-placeholder',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }
  
  const optionalEnvVars = {
    SERVICE_KEY: isServer ? process.env.SERVICE_KEY : undefined,
    CRON_SECRET: isServer ? process.env.CRON_SECRET : undefined,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    SESSION_TIMEOUT_MINUTES: process.env.SESSION_TIMEOUT_MINUTES,
    ADMIN_SECRET: isServer ? process.env.ADMIN_SECRET : undefined,
    ADMIN_EMAILS: isServer ? process.env.ADMIN_EMAILS : undefined,
  }

  const missingVars: string[] = []
  
  // クライアント側では、NEXT_PUBLIC_で始まる変数のみチェック
  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value && (isServer || key.startsWith('NEXT_PUBLIC_'))) {
      missingVars.push(key)
    }
  }

  if (missingVars.length > 0 && isServer) {
    console.error('Environment variables check:')
    Object.entries(requiredEnvVars).forEach(([key, value]) => {
      console.error(`- ${key}: ${value ? '✓ Set' : '✗ Missing'}`)
    })
    throw new Error(
      `次の環境変数が設定されていません: ${missingVars.join(', ')}`
    )
  }

  return { ...requiredEnvVars, ...optionalEnvVars } as Env
}

// シングルトンパターンで環境変数を管理
let cachedEnv: Env | null = null

export function getEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = validateEnv()
  }
  return cachedEnv
}