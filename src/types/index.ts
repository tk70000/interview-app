// ユーザーロールの定義
export type UserRole = 'candidate' | 'recruiter' | 'admin'

// 候補者情報
export interface Candidate {
  id: string
  name: string
  email: string
  cv_url?: string
  cv_summary?: string
  created_at: string
  updated_at: string
}

// セッション情報
export interface Session {
  id: string
  candidate_id: string
  status: 'active' | 'completed' | 'timeout'
  started_at: string
  ended_at?: string
  summary?: string
  admin_note?: string
  admin_updated_at?: string
}

// メッセージ情報
export interface Message {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
  metadata?: MessageMetadata
}

// メッセージメタデータ
export interface MessageMetadata {
  question_type?: 'initial' | 'followup' | 'clarification'
  response_time_ms?: number
  token_count?: number
  keywords?: string[]
}

// CVアップロードレスポンス
export interface CVUploadResponse {
  success: boolean
  cv_url?: string
  summary?: string
  initial_questions?: string[]
  error?: string
}

// チャットストリーミングイベント
export interface ChatStreamEvent {
  type: 'start' | 'chunk' | 'end' | 'error'
  content?: string
  error?: string
  metadata?: any
}

// ダッシュボード統計情報
export interface DashboardStats {
  total_candidates: number
  active_sessions: number
  completed_sessions: number
  average_session_duration_minutes: number
  average_messages_per_session: number
}

// 質問テンプレート
export interface QuestionTemplate {
  id: string
  category: string
  question: string
  follow_up_conditions?: string[]
}

// エラーレスポンス
export interface ErrorResponse {
  error: string
  code?: string
  details?: any
}

// API レスポンスの共通型
export interface ApiResponse<T> {
  data?: T
  error?: ErrorResponse
  success: boolean
}

// 管理者機能用の型定義

// 管理者ユーザー
export interface AdminUser {
  id: string
  email: string
  name?: string
  role: 'admin' | 'super_admin'
  is_active: boolean
  created_at: string
  updated_at: string
}

// 管理者アクティビティログ
export interface AdminActivityLog {
  id: string
  admin_email: string
  action: string
  resource_type: string
  resource_id?: string
  details?: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at: string
}

// セッション統計（管理者用）
export interface SessionStats {
  totalMessages: number
  userMessages: number
  assistantMessages: number
  firstMessageAt?: string
  lastMessageAt?: string
  sessionDuration: number
}

// 管理者用のセッション詳細
export interface AdminSessionDetail {
  session: Session & {
    candidates: Candidate
  }
  messages: Message[]
  stats: SessionStats
}

// 管理者認証結果
export interface AdminAuthResult {
  isAdmin: boolean
  method: 'email' | 'secret' | 'dev' | 'none'
  email?: string
}

// 管理者チャット一覧のレスポンス
export interface AdminChatsResponse {
  sessions: Array<Session & {
    candidates: Candidate
    message_count: number
  }>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  adminAuth: AdminAuthResult
}
