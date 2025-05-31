-- ユーザー認証のためのカラムを追加

-- candidates テーブルに user_id を追加
ALTER TABLE candidates 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 既存のデータに対してデフォルトユーザーを設定（開発環境用）
-- 本番環境では適切なマイグレーション戦略が必要
UPDATE candidates SET user_id = auth.uid() WHERE user_id IS NULL;

-- user_id を NOT NULL に変更
ALTER TABLE candidates 
ALTER COLUMN user_id SET NOT NULL;

-- インデックスを追加
CREATE INDEX idx_candidates_user_id ON candidates(user_id);

-- RLS (Row Level Security) を有効化
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- candidates のポリシー
CREATE POLICY "Users can view own candidates" ON candidates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own candidates" ON candidates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own candidates" ON candidates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own candidates" ON candidates
  FOR DELETE USING (auth.uid() = user_id);

-- sessions のポリシー
CREATE POLICY "Users can view own sessions" ON sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM candidates 
      WHERE candidates.id = sessions.candidate_id 
      AND candidates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own sessions" ON sessions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM candidates 
      WHERE candidates.id = sessions.candidate_id 
      AND candidates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own sessions" ON sessions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM candidates 
      WHERE candidates.id = sessions.candidate_id 
      AND candidates.user_id = auth.uid()
    )
  );

-- messages のポリシー
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions 
      JOIN candidates ON candidates.id = sessions.candidate_id
      WHERE sessions.id = messages.session_id 
      AND candidates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own messages" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions 
      JOIN candidates ON candidates.id = sessions.candidate_id
      WHERE sessions.id = messages.session_id 
      AND candidates.user_id = auth.uid()
    )
  );

-- embeddings のポリシー
CREATE POLICY "Users can view own embeddings" ON embeddings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages
      JOIN sessions ON sessions.id = messages.session_id
      JOIN candidates ON candidates.id = sessions.candidate_id
      WHERE messages.id = embeddings.message_id 
      AND candidates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own embeddings" ON embeddings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages
      JOIN sessions ON sessions.id = messages.session_id
      JOIN candidates ON candidates.id = sessions.candidate_id
      WHERE messages.id = embeddings.message_id 
      AND candidates.user_id = auth.uid()
    )
  );