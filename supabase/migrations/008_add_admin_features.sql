-- 管理者機能用のテーブル拡張

-- sessionsテーブルに管理者メモカラムを追加
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS admin_note TEXT,
ADD COLUMN IF NOT EXISTS admin_updated_at TIMESTAMP WITH TIME ZONE;

-- sessionsテーブルにインデックスを追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_candidate_id ON sessions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

-- messagesテーブルにインデックスを追加
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- candidatesテーブルにインデックスを追加
CREATE INDEX IF NOT EXISTS idx_candidates_created_at ON candidates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);

-- 管理者ユーザー用のテーブル作成（将来的な拡張用）
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 管理者アクティビティログテーブル
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 管理者アクティビティログのインデックス
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_email ON admin_activity_logs(admin_email);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at ON admin_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_action ON admin_activity_logs(action);

-- セッション統計ビューの作成（パフォーマンス向上）
CREATE OR REPLACE VIEW session_stats AS
SELECT 
  s.id,
  s.candidate_id,
  s.status,
  s.started_at,
  s.ended_at,
  s.admin_note,
  s.admin_updated_at,
  c.name as candidate_name,
  c.email as candidate_email,
  COUNT(m.id) as message_count,
  MIN(m.created_at) as first_message_at,
  MAX(m.created_at) as last_message_at,
  EXTRACT(EPOCH FROM (MAX(m.created_at) - MIN(m.created_at))) as session_duration_seconds
FROM sessions s
LEFT JOIN candidates c ON s.candidate_id = c.id
LEFT JOIN messages m ON s.id = m.session_id
GROUP BY s.id, s.candidate_id, s.status, s.started_at, s.ended_at, s.admin_note, s.admin_updated_at, c.name, c.email;

-- RLS (Row Level Security) ポリシーの設定
-- 管理者機能は現時点では全データにアクセス可能とする（将来的にはより厳密な制御を実装）

-- admin_usersテーブルのRLSを有効化
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- admin_activity_logsテーブルのRLSを有効化
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- 管理者による全データアクセスポリシー（開発用）
-- 本番環境では適切な認証チェックを追加する必要がある
CREATE POLICY IF NOT EXISTS "Allow admin access to admin_users" ON admin_users
  FOR ALL USING (true);

CREATE POLICY IF NOT EXISTS "Allow admin access to admin_activity_logs" ON admin_activity_logs
  FOR ALL USING (true);

-- セッション更新時の自動タイムスタンプ更新トリガー
CREATE OR REPLACE FUNCTION update_session_admin_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.admin_note IS DISTINCT FROM OLD.admin_note THEN
    NEW.admin_updated_at = CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成
DROP TRIGGER IF EXISTS trigger_update_session_admin_timestamp ON sessions;
CREATE TRIGGER trigger_update_session_admin_timestamp
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_admin_timestamp();

-- コメント追加
COMMENT ON TABLE admin_users IS '管理者ユーザー情報';
COMMENT ON TABLE admin_activity_logs IS '管理者のアクティビティログ';
COMMENT ON VIEW session_stats IS 'セッション統計情報（パフォーマンス最適化用ビュー）';
COMMENT ON COLUMN sessions.admin_note IS '管理者メモ';
COMMENT ON COLUMN sessions.admin_updated_at IS '管理者による最終更新日時';