-- テストアカウント作成用のマイグレーション
-- 注意: 本番環境では実行しないでください

-- Supabase Authを使用してテストユーザーを作成
-- 以下のアカウントはSupabase Dashboardから手動で作成するか、
-- Supabase CLIを使用して作成してください

-- テストアカウント情報:
-- 
-- 1. 一般ユーザー
-- Email: test@example.com
-- Password: Test1234!
-- 
-- 2. 管理者ユーザー
-- Email: admin@example.com
-- Password: Admin1234!
-- 
-- 3. デモユーザー
-- Email: demo@example.com
-- Password: Demo1234!

-- Supabase Dashboardでの作成手順:
-- 1. Supabase Dashboardにログイン
-- 2. Authentication > Users タブを開く
-- 3. "Invite user" または "Create user" ボタンをクリック
-- 4. 上記のメールアドレスとパスワードを入力
-- 5. "Auto Confirm User" をONにして作成

-- または、開発環境でのテスト用に認証を簡略化する場合は
-- サインインページで以下のロジックを実装済み:
-- - 任意のメールアドレスとパスワードでログイン可能（デモモード）