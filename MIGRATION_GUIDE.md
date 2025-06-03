# マイグレーション実行ガイド

## 🚨 重要: マイグレーションが未実行です

現在、管理者機能のマイグレーション（`008_add_admin_features.sql`）が実行されていないため、管理者チャット閲覧機能でエラーが発生しています。

## エラー内容

```
エラー: セッションの取得に失敗しました: column sessions.admin_note does not exist
```

## 原因

Supabaseのデータベースに以下のカラムが存在していません：
- `sessions.admin_note` - 管理者メモ用カラム
- `sessions.admin_updated_at` - 管理者による最終更新日時

## 解決方法

### 方法1: Supabase管理画面から実行（推奨）

1. [Supabase Dashboard](https://app.supabase.com) にログイン
2. 対象プロジェクトを選択
3. 左メニューから「SQL Editor」を選択
4. 以下のマイグレーションファイルを順番に実行：

#### 未実行の可能性があるマイグレーション

以下のファイルを確認し、未実行のものがあれば順番に実行してください：

1. `supabase/migrations/005_add_interview_availability.sql`
2. `supabase/migrations/006_add_session_continuation.sql`
3. `supabase/migrations/007_add_demo_user_support.sql`
4. `supabase/migrations/008_add_admin_features.sql` ⚠️ **特に重要**

### 方法2: Supabase CLIを使用（ローカル開発）

```bash
# Supabase CLIのインストール（未インストールの場合）
npm install -g supabase

# プロジェクトとリンク
supabase link --project-ref <your-project-ref>

# マイグレーションの実行
supabase db push
```

### 方法3: 最小限のマイグレーション（応急処置）

管理者メモ機能のみを追加する最小限のSQL：

```sql
-- sessionsテーブルに管理者メモカラムを追加
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS admin_note TEXT,
ADD COLUMN IF NOT EXISTS admin_updated_at TIMESTAMP WITH TIME ZONE;
```

## 確認方法

マイグレーション実行後、以下のSQLで確認：

```sql
-- カラムの存在確認
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sessions' 
AND column_name IN ('admin_note', 'admin_updated_at');
```

## 一時的な対応

マイグレーションを実行するまでの間、以下の対応を実施しています：

1. APIクエリから`admin_note`関連のフィールドを除外
2. 管理者メモ機能のUIを非表示化
3. 基本的なチャット閲覧機能は動作可能

## マイグレーション実行後の作業

1. コメントアウトした以下の部分を復元：
   - `src/app/api/admin/chats/route.ts` - `admin_note`をselectに追加
   - `src/app/api/admin/chats/[sessionId]/route.ts` - `admin_note`関連の処理
   - `src/app/admin/chats/[sessionId]/page.tsx` - 管理者メモUIの表示

2. gitで変更を確認：
   ```bash
   git diff
   ```

3. 元に戻す：
   ```bash
   git checkout src/app/api/admin/chats/route.ts
   git checkout src/app/api/admin/chats/\[sessionId\]/route.ts
   git checkout src/app/admin/chats/\[sessionId\]/page.tsx
   ```

## セキュリティ注意事項

本番環境でマイグレーションを実行する際は：
1. 必ずバックアップを取得
2. メンテナンス時間を設定
3. 段階的に実行（開発→ステージング→本番）