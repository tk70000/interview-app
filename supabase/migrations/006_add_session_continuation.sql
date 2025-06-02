-- sessionsテーブルに継続チャット用のカラムを追加
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS summary TEXT;

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- candidatesテーブルにユーザーIDを追加
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- ユーザーIDでのインデックスを追加
CREATE INDEX IF NOT EXISTS idx_candidates_user_id ON candidates(user_id);

-- ユーザーの最新セッション情報テーブル
CREATE TABLE IF NOT EXISTS user_latest_sessions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  latest_session_id UUID REFERENCES sessions(id),
  latest_cv_id UUID REFERENCES candidates(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- セッションのメタデータテーブル
CREATE TABLE IF NOT EXISTS session_metadata (
  session_id UUID PRIMARY KEY REFERENCES sessions(id),
  total_messages INTEGER DEFAULT 0,
  last_message_at TIMESTAMP WITH TIME ZONE,
  ai_summary TEXT,
  topics TEXT[],
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLSポリシー for sessions
CREATE POLICY "Users can view their own sessions" ON sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- RLSポリシー for candidates
CREATE POLICY "Users can view their own candidates" ON candidates
  FOR SELECT USING (auth.uid() = user_id);

-- RLSポリシー for user_latest_sessions
ALTER TABLE user_latest_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their latest sessions" ON user_latest_sessions
  FOR ALL USING (auth.uid() = user_id);

-- RLSポリシー for session_metadata
ALTER TABLE session_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their session metadata" ON session_metadata
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM sessions 
    WHERE sessions.id = session_metadata.session_id 
    AND sessions.user_id = auth.uid()
  ));