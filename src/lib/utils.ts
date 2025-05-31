import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 日付フォーマット
export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// セッション時間計算
export function calculateSessionDuration(startTime: string, endTime?: string): string {
  const start = new Date(startTime)
  const end = endTime ? new Date(endTime) : new Date()
  
  const diffMs = end.getTime() - start.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 60) {
    return `${diffMins}分`
  }
  
  const hours = Math.floor(diffMins / 60)
  const mins = diffMins % 60
  return `${hours}時間${mins}分`
}

// テキストの要約（最初のN文字）
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// エラーメッセージの取得
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'エラーが発生しました'
}

// ファイルサイズのフォーマット
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// UUIDの生成
export function generateId(): string {
  return crypto.randomUUID()
}

// デバウンス関数
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// セッションタイムアウトチェック
export function isSessionTimeout(startTime: string, timeoutMinutes: number = 30): boolean {
  const start = new Date(startTime)
  const now = new Date()
  const diffMinutes = (now.getTime() - start.getTime()) / 60000
  
  return diffMinutes > timeoutMinutes
}

// メッセージのロール表示名
export function getRoleDisplayName(role: string): string {
  switch (role) {
    case 'user':
      return '候補者'
    case 'assistant':
      return 'AI'
    case 'system':
      return 'システム'
    default:
      return role
  }
}

// キーワード抽出（簡易版）
export function extractKeywords(text: string, minLength: number = 3): string[] {
  // 一般的な日本語ストップワード
  const stopWords = new Set([
    'です', 'ます', 'ました', 'でした', 'ある', 'いる', 'する', 'なる',
    'この', 'その', 'あの', 'どの', 'それ', 'これ', 'あれ', 'どれ',
    'から', 'まで', 'より', 'ほど', 'など', 'ため', 'ので', 'けど',
    'でも', 'しかし', 'また', 'および', 'または', 'つまり', 'ただし'
  ])

  // 単語に分割（簡易版 - 実際はMeCabなどを使用）
  const words = text
    .split(/[\s、。！？\n]+/)
    .filter(word => word.length >= minLength)
    .filter(word => !stopWords.has(word))
    .filter(word => !/^\d+$/.test(word)) // 数字のみは除外

  // 重複を除去して頻度順にソート
  const wordCount = new Map<string, number>()
  words.forEach(word => {
    wordCount.set(word, (wordCount.get(word) || 0) + 1)
  })

  return Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word)
}
