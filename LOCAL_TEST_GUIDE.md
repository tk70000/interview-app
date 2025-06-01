# ローカルでGitHub統合をテストする方法

## 前提条件
- GitHub OAuth Appが作成済み
- `.env.local`に必要な環境変数が設定済み
- Supabaseでgithub_connectionsテーブルが作成済み

## テスト手順

### 1. 開発サーバー起動
```bash
npm run dev
```

### 2. アカウント作成・ログイン
1. http://localhost:3000/auth/signup でアカウント作成
2. または http://localhost:3000/auth/signin でログイン
   - テストアカウント使用可：`test@example.com` / `Test1234!`

### 3. GitHub連携テスト
1. ログイン後、ブラウザで以下にアクセス：
   ```
   http://localhost:3000/api/auth/github
   ```

2. GitHubの認証画面が表示される
3. 「Authorize」をクリック
4. 成功すると `/dashboard?github=connected` にリダイレクト

### 4. 機能確認

#### リポジトリ一覧取得
```bash
# 別ターミナルで実行（Cookieが必要なのでブラウザで確認推奨）
curl http://localhost:3000/api/v1/github/repositories \
  -H "Cookie: [ブラウザからコピー]"
```

またはブラウザで直接アクセス：
- http://localhost:3000/api/v1/github/repositories

#### ワークフロー確認
```bash
# owner と repo は実際の値に置き換え
http://localhost:3000/api/v1/github/workflows?owner=YOUR_USERNAME&repo=YOUR_REPO
```

### 5. データベース確認
Supabase Table Editorで確認：
```sql
SELECT * FROM github_connections WHERE user_id = 'YOUR_USER_ID';
```

## トラブルシューティング

### "GitHub not connected" エラー
1. github_connectionsテーブルにデータがあるか確認
2. トークンが正しく保存されているか確認

### 認証エラー
1. GitHub OAuth AppのCallback URLが正確か確認
2. Client ID/Secretが正しいか確認

### CORS エラー
開発環境では通常発生しないが、もし発生したら：
```javascript
// next.config.js に追加
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: 'http://localhost:3000' },
      ],
    },
  ]
}
```

## ローカルテスト用のモックモード

GitHub APIを実際に呼び出したくない場合、環境変数で制御可能：
```bash
# .env.local に追加
MOCK_GITHUB_API=true
```

※ 現在この機能は実装されていませんが、必要であれば追加可能です。