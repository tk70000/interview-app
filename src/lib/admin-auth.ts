import { NextRequest } from 'next/server'
import { getEnv } from './env'

// 管理者権限チェック
export function isAdminEmail(email: string): boolean {
  const env = getEnv()
  if (!env.ADMIN_EMAILS) return false
  
  const adminEmails = env.ADMIN_EMAILS.split(',').map(e => e.trim())
  return adminEmails.includes(email)
}

// 管理者認証ヘッダーチェック
export function verifyAdminSecret(request: NextRequest): boolean {
  const env = getEnv()
  if (!env.ADMIN_SECRET) return false
  
  const authHeader = request.headers.get('x-admin-secret')
  return authHeader === env.ADMIN_SECRET
}

// 管理者権限の複合チェック
export function isAuthorizedAdmin(email?: string, adminSecret?: string): boolean {
  const env = getEnv()
  
  // 開発環境では緩い認証
  if (env.NODE_ENV === 'development') {
    return true
  }
  
  // 本番環境では厳密な認証
  if (adminSecret && env.ADMIN_SECRET && adminSecret === env.ADMIN_SECRET) {
    return true
  }
  
  if (email && isAdminEmail(email)) {
    return true
  }
  
  return false
}

// 管理者認証レスポンス用の型
export interface AdminAuthResult {
  isAdmin: boolean
  method: 'email' | 'secret' | 'dev' | 'none'
  email?: string
}

// 包括的な管理者認証チェック
export function checkAdminAuth(request: NextRequest, userEmail?: string): AdminAuthResult {
  const env = getEnv()
  const adminSecret = request.headers.get('x-admin-secret')
  
  // 開発環境
  if (env.NODE_ENV === 'development') {
    return { isAdmin: true, method: 'dev', email: userEmail }
  }
  
  // シークレットキーによる認証
  if (adminSecret && env.ADMIN_SECRET && adminSecret === env.ADMIN_SECRET) {
    return { isAdmin: true, method: 'secret', email: userEmail }
  }
  
  // メールアドレスによる認証
  if (userEmail && isAdminEmail(userEmail)) {
    return { isAdmin: true, method: 'email', email: userEmail }
  }
  
  return { isAdmin: false, method: 'none' }
}