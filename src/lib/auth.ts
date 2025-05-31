import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { cache } from 'react'

// サーバーコンポーネント用の認証ユーティリティ
export const getSession = cache(async () => {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error || !session) {
    return null
  }
  
  return session
})

// 現在のユーザーを取得
export const getCurrentUser = cache(async () => {
  const session = await getSession()
  return session?.user || null
})

// ユーザーが特定のリソースにアクセスできるかチェック
export async function canAccessResource(
  resourceType: 'session' | 'candidate',
  resourceId: string,
  userId?: string
): Promise<boolean> {
  if (!userId) {
    const user = await getCurrentUser()
    if (!user) return false
    userId = user.id
  }
  
  const supabase = createServerComponentClient({ cookies })
  
  if (resourceType === 'session') {
    const { data: session } = await supabase
      .from('sessions')
      .select('candidate_id')
      .eq('id', resourceId)
      .single()
    
    if (!session) return false
    
    // セッションに紐づく候補者の所有者をチェック
    const { data: candidate } = await supabase
      .from('candidates')
      .select('user_id')
      .eq('id', session.candidate_id)
      .single()
    
    return candidate?.user_id === userId
  }
  
  if (resourceType === 'candidate') {
    const { data: candidate } = await supabase
      .from('candidates')
      .select('user_id')
      .eq('id', resourceId)
      .single()
    
    return candidate?.user_id === userId
  }
  
  return false
}

// APIルート用の認証チェック
export async function requireAuth() {
  const session = await getSession()
  
  if (!session) {
    throw new Error('認証が必要です')
  }
  
  return session
}