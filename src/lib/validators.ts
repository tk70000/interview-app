import { z } from 'zod'

// 候補者情報のバリデーション
export const candidateSchema = z.object({
  name: z.string()
    .min(1, '名前は必須です')
    .max(100, '名前は100文字以内で入力してください')
    .regex(/^[a-zA-Zぁ-んァ-ヶー一-龠々\s]+$/, '使用できない文字が含まれています'),
  email: z.string()
    .email('有効なメールアドレスを入力してください')
    .max(255, 'メールアドレスは255文字以内で入力してください')
    .toLowerCase(),
})

// メッセージのバリデーション
export const messageSchema = z.object({
  content: z.string()
    .min(1, 'メッセージを入力してください')
    .max(10000, 'メッセージは10000文字以内で入力してください')
    .trim(),
})

// セッションIDのバリデーション
export const sessionIdSchema = z.string()
  .uuid('無効なセッションIDです')

// ファイルのバリデーション
export const fileSchema = z.object({
  name: z.string().max(255),
  type: z.enum([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/json'
  ]),
  size: z.number().max(5 * 1024 * 1024), // 5MB
})

// APIレスポンスのサニタイズ
export function sanitizeApiResponse<T>(data: T): T {
  // センシティブな情報を除去
  const sanitized = JSON.parse(JSON.stringify(data), (key, value) => {
    // パスワード、トークン、キーなどを除去
    if (typeof key === 'string' && 
        (key.toLowerCase().includes('password') ||
         key.toLowerCase().includes('token') ||
         key.toLowerCase().includes('key') ||
         key.toLowerCase().includes('secret'))) {
      return '[REDACTED]'
    }
    return value
  })
  
  return sanitized
}

// HTMLエスケープ（XSS対策）
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

// SQLインジェクション対策（Supabaseを使用しているため基本的に不要だが念のため）
export function sanitizeSqlInput(input: string): string {
  // Supabaseのパラメータ化クエリを使用するため、この関数は使用しない
  // ここではログ用にサニタイズ
  return input.replace(/[^\w\s@.-]/g, '')
}