# テスト優先度リスト

## 🚨 最優先でテストすべき機能

### 1. CVアップロードのバリデーション
```typescript
// テストケース例
describe('CV Upload Validation', () => {
  test('5MB以上のファイルを拒否する', () => {
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
    expect(validateFile(largeFile)).toEqual({
      valid: false,
      error: 'ファイルサイズが大きすぎます。最大サイズ: 5MB'
    });
  });

  test('サポートされていないファイル形式を拒否する', () => {
    const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    expect(validateFile(invalidFile)).toEqual({
      valid: false,
      error: expect.stringContaining('サポートされていないファイル形式')
    });
  });
});
```

### 2. 認証状態の管理
```typescript
// テストケース例
describe('Authentication', () => {
  test('テストモードでのログイン', async () => {
    process.env.NEXT_PUBLIC_DISABLE_AUTH = 'true';
    const result = await signIn('test@example.com', 'Test1234!');
    expect(result.success).toBe(true);
  });

  test('無効な認証情報でのログイン失敗', async () => {
    const result = await signIn('invalid@example.com', 'wrong');
    expect(result.success).toBe(false);
  });
});
```

### 3. GitHub API エラーハンドリング
```typescript
// テストケース例
describe('GitHub Integration', () => {
  test('無効なトークンでのAPI呼び出し', async () => {
    const mockFetch = jest.fn().mockRejectedValue(new Error('401 Unauthorized'));
    const result = await getUserRepositories('invalid-token');
    expect(result).toEqual({ error: 'Unauthorized' });
  });

  test('レート制限エラーの処理', async () => {
    const mockResponse = {
      status: 429,
      headers: { 'X-RateLimit-Remaining': '0' }
    };
    // レート制限エラーが適切に処理されることを確認
  });
});
```

## 🛡️ セキュリティ関連のテスト

### 1. 環境変数の漏洩防止
- APIキーがクライアントサイドに露出していないか
- エラーメッセージに機密情報が含まれていないか

### 2. 入力値のサニタイゼーション
- XSS攻撃への対策
- SQLインジェクション対策（Supabase RLSで保護されているが確認必要）

## 📊 パフォーマンステスト

### 1. 大きなファイルの処理
- 5MBに近いファイルのアップロード速度
- CV要約生成の処理時間

### 2. 同時アクセス
- 複数ユーザーの同時アップロード
- GitHub API の同時呼び出し

## 🔧 実装の推奨事項

### 1. テストフレームワークの導入
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev @types/jest ts-jest
```

### 2. モックの活用
- Supabase クライアントのモック
- fetch APIのモック
- ファイルアップロードのモック

### 3. E2Eテストの追加（将来的に）
```bash
npm install --save-dev playwright
# または
npm install --save-dev cypress
```

## 優先順位まとめ

1. **即座に実装すべき**
   - ファイルバリデーションテスト
   - 基本的な認証フローテスト
   
2. **次に実装すべき**
   - GitHub API エラーハンドリング
   - セッション管理テスト
   
3. **将来的に実装**
   - E2Eテスト
   - パフォーマンステスト