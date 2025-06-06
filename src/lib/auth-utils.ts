// 認証をスキップするかどうかの判定
export function isAuthDisabled(): boolean {
  return process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true'
}

// テスト用のユーザーID
export function getTestUserId(): string {
  return '00000000-0000-0000-0000-000000000000'
}