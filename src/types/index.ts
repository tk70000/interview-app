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
