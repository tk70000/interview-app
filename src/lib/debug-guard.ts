import { NextResponse } from 'next/server'

/**
 * 本番環境でのデバッグエンドポイントアクセスを制限する
 */
export function productionGuard() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'このエンドポイントは本番環境では利用できません' },
      { status: 404 }
    )
  }
  return null
}