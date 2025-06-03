import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

// クライアントコンポーネント用の認証ユーティリティ
export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }
  
  return user
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw error
  }
}