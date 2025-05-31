import { LRUCache } from 'lru-cache'

export type RateLimitResult = {
  success: boolean
  limit: number
  remaining: number
  reset: Date
}

interface RateLimiterOptions {
  uniqueTokenPerInterval: number
  interval: number
}

export class RateLimiter {
  private tokenCache: LRUCache<string, number[]>
  private interval: number

  constructor(options?: RateLimiterOptions) {
    this.interval = options?.interval ?? 60000 // デフォルト: 1分
    this.tokenCache = new LRUCache<string, number[]>({
      max: options?.uniqueTokenPerInterval ?? 500,
      ttl: this.interval,
    })
  }

  async check(
    identifier: string,
    limit: number
  ): Promise<RateLimitResult> {
    const now = Date.now()
    const tokenBucket = this.tokenCache.get(identifier) ?? []
    
    // 期限切れのトークンを削除
    const activeTokens = tokenBucket.filter(
      timestamp => now - timestamp < this.interval
    )

    if (activeTokens.length >= limit) {
      return {
        success: false,
        limit,
        remaining: 0,
        reset: new Date(activeTokens[0] + this.interval),
      }
    }

    // 新しいトークンを追加
    activeTokens.push(now)
    this.tokenCache.set(identifier, activeTokens)

    return {
      success: true,
      limit,
      remaining: limit - activeTokens.length,
      reset: new Date(now + this.interval),
    }
  }
}

// グローバルレート制限インスタンス
const rateLimiters = new Map<string, RateLimiter>()

export function getRateLimiter(name: string, options?: RateLimiterOptions): RateLimiter {
  if (!rateLimiters.has(name)) {
    rateLimiters.set(name, new RateLimiter(options))
  }
  return rateLimiters.get(name)!
}

// 一般的なレート制限設定
export const RATE_LIMITS = {
  // API全般: 1分あたり60リクエスト
  api: { limit: 60, window: 60000 },
  
  // チャットメッセージ: 1分あたり20メッセージ
  chat: { limit: 20, window: 60000 },
  
  // ファイルアップロード: 1時間あたり10ファイル
  upload: { limit: 10, window: 3600000 },
  
  // ダッシュボード: 1分あたり30リクエスト
  dashboard: { limit: 30, window: 60000 },
  
  // 認証試行: 1時間あたり5回
  auth: { limit: 5, window: 3600000 },
}