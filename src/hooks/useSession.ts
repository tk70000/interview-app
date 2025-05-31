import { useState, useEffect } from 'react'
import { useInterval } from './useInterval'
import { supabase } from '@/lib/supabase'
import { Session } from '@/types'

interface UseSessionState {
  session: Session | null
  isActive: boolean
  timeRemaining: number // 残り時間（秒）
  extendSession: () => Promise<void>
  endSession: () => Promise<void>
}

const SESSION_TIMEOUT_MINUTES = 30
const SESSION_WARNING_MINUTES = 5

export function useSession(sessionId: string | null): UseSessionState {
  const [session, setSession] = useState<Session | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(SESSION_TIMEOUT_MINUTES * 60)

  // セッション情報を取得
  useEffect(() => {
    if (!sessionId) return

    const fetchSession = async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (!error && data) {
        setSession(data)
        
        // 残り時間を計算
        const startTime = new Date(data.started_at).getTime()
        const now = Date.now()
        const elapsedSeconds = Math.floor((now - startTime) / 1000)
        const remaining = Math.max(0, SESSION_TIMEOUT_MINUTES * 60 - elapsedSeconds)
        setTimeRemaining(remaining)
      }
    }

    fetchSession()
  }, [sessionId])

  // 1秒ごとに残り時間を更新
  useInterval(() => {
    if (session && session.status === 'active' && timeRemaining > 0) {
      setTimeRemaining(prev => Math.max(0, prev - 1))
    }
  }, session?.status === 'active' ? 1000 : null)

  // タイムアウト処理
  useEffect(() => {
    if (timeRemaining === 0 && session?.status === 'active') {
      endSession('timeout')
    }
  }, [timeRemaining, session])

  // セッション延長
  const extendSession = async () => {
    if (!sessionId) return

    // 現在時刻で開始時刻を更新（実装簡略化）
    const { error } = await supabase
      .from('sessions')
      .update({ started_at: new Date().toISOString() })
      .eq('id', sessionId)

    if (!error) {
      setTimeRemaining(SESSION_TIMEOUT_MINUTES * 60)
    }
  }

  // セッション終了
  const endSession = async (status: 'completed' | 'timeout' = 'completed') => {
    if (!sessionId) return

    const { error } = await supabase
      .from('sessions')
      .update({ 
        status,
        ended_at: new Date().toISOString() 
      })
      .eq('id', sessionId)

    if (!error && session) {
      setSession({ ...session, status, ended_at: new Date().toISOString() })
    }
  }

  const isActive = session?.status === 'active' && timeRemaining > 0

  return {
    session,
    isActive,
    timeRemaining,
    extendSession,
    endSession,
  }
}
