// 認証をスキップするかどうかの判定
export function isAuthDisabled(): boolean {
  return process.env.DISABLE_AUTH === 'true'
}

// テスト用のユーザーID
export function getTestUserId(): string {
  return 'test-user-id'
}