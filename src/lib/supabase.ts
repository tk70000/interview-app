import { createClient } from '@supabase/supabase-js'

// 環境変数を直接使用（クライアント側でも使用されるため）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
}
if (!supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database型定義
export type Database = {
  public: {
    Tables: {
      candidates: {
        Row: {
          id: string
          name: string
          email: string
          cv_url: string | null
          cv_summary: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          cv_url?: string | null
          cv_summary?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          cv_url?: string | null
          cv_summary?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          candidate_id: string
          status: 'active' | 'completed' | 'timeout'
          started_at: string
          ended_at: string | null
          summary: string | null
        }
        Insert: {
          id?: string
          candidate_id: string
          status?: 'active' | 'completed' | 'timeout'
          started_at?: string
          ended_at?: string | null
          summary?: string | null
        }
        Update: {
          id?: string
          candidate_id?: string
          status?: 'active' | 'completed' | 'timeout'
          started_at?: string
          ended_at?: string | null
          summary?: string | null
        }
      }
      messages: {
        Row: {
          id: string
          session_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          created_at: string
          metadata: any | null
        }
        Insert: {
          id?: string
          session_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          created_at?: string
          metadata?: any | null
        }
        Update: {
          id?: string
          session_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          created_at?: string
          metadata?: any | null
        }
      }
      embeddings: {
        Row: {
          id: string
          message_id: string
          vector: number[]
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          vector: number[]
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          vector?: number[]
          created_at?: string
        }
      }
      github_connections: {
        Row: {
          id: string
          user_id: string
          github_token: string
          github_username: string | null
          scopes: string[] | null
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          github_token: string
          github_username?: string | null
          scopes?: string[] | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          github_token?: string
          github_username?: string | null
          scopes?: string[] | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_embeddings: {
        Args: {
          query_embedding: number[]
          match_threshold: number
          match_count: number
        }
        Returns: {
          message_id: string
          content: string
          similarity: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
