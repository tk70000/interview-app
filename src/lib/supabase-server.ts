import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Route Handlerで使用するクライアント作成関数
export const createClient = async () => {
  return createRouteHandlerClient({ cookies })
}

// Server-side用のクライアント（Service Role Key使用）
export const getServiceSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseServiceKey) {
    throw new Error('SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY is not set')
  }
  return createSupabaseClient(supabaseUrl, supabaseServiceKey)
}