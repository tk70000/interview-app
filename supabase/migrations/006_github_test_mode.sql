-- テストモード用: auth.usersに依存しないgithub_connectionsテーブル
-- 注意: 本番環境では使用しないでください

-- 既存のテーブルがある場合は削除
DROP TABLE IF EXISTS github_connections CASCADE;

-- user_idをUUIDとして作成（auth.usersへの外部キー制約なし）
CREATE TABLE github_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  github_token TEXT NOT NULL,
  github_username TEXT,
  scopes TEXT[],
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index
CREATE INDEX idx_github_connections_user_id ON github_connections(user_id);

-- Enable RLS
ALTER TABLE github_connections ENABLE ROW LEVEL SECURITY;

-- テストモード用のポリシー（Service Roleキーでのアクセスを許可）
CREATE POLICY "Service role full access"
  ON github_connections
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_github_connections_updated_at BEFORE UPDATE
  ON github_connections FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- テスト用のダミーデータを挿入（オプション）
-- INSERT INTO github_connections (user_id, github_token, github_username)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'dummy_token', 'test_user');