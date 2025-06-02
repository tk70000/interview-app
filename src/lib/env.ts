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
  // Email settings
  SMTP_HOST: string
  SMTP_PORT: number
  SMTP_USER: string
  SMTP_PASS: string
  SMTP_FROM: string
  CAREER_ADVISOR_EMAIL_LIST: string
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
    // Email settings for server side
    SMTP_HOST: isServer ? process.env.SMTP_HOST : 'client-side-placeholder',
    SMTP_PORT: isServer ? Number(process.env.SMTP_PORT) : 587,
    SMTP_USER: isServer ? process.env.SMTP_USER : 'client-side-placeholder',
    SMTP_PASS: isServer ? process.env.SMTP_PASS : 'client-side-placeholder',
    SMTP_FROM: isServer ? process.env.SMTP_FROM : 'client-side-placeholder',
    CAREER_ADVISOR_EMAIL_LIST: isServer ? process.env.CAREER_ADVISOR_EMAIL_LIST : 'client-side-placeholder',
  }
  
  const optionalEnvVars = {
    SERVICE_KEY: isServer ? process.env.SERVICE_KEY : undefined,
    CRON_SECRET: isServer ? process.env.CRON_SECRET : undefined,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    SESSION_TIMEOUT_MINUTES: process.env.SESSION_TIMEOUT_MINUTES,
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