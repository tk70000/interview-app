-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 候補者テーブル
CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    cv_url TEXT,
    cv_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- セッションテーブル
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'timeout')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    summary TEXT,
    CONSTRAINT valid_session_dates CHECK (ended_at IS NULL OR ended_at >= started_at)
);

-- メッセージテーブル
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- 埋め込みベクトルテーブル
CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    vector vector(1536) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックスの作成
CREATE INDEX idx_candidates_email ON candidates(email);
CREATE INDEX idx_sessions_candidate_id ON sessions(candidate_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_embeddings_message_id ON embeddings(message_id);

-- ベクトル検索用のインデックス（IVFFlatを使用）
CREATE INDEX idx_embeddings_vector ON embeddings USING ivfflat (vector vector_cosine_ops)
WITH (lists = 100);

-- RLS（Row Level Security）の有効化
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- トリガー関数：updated_atの自動更新
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- candidatesテーブルのupdated_atトリガー
CREATE TRIGGER update_candidates_updated_at
BEFORE UPDATE ON candidates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ベクトル類似検索関数
CREATE OR REPLACE FUNCTION match_embeddings(
    query_embedding vector(1536),
    match_threshold float,
    match_count int
)
RETURNS TABLE (
    message_id UUID,
    content TEXT,
    similarity float
)
LANGUAGE sql STABLE
AS $$
    SELECT 
        m.id as message_id,
        m.content,
        1 - (e.vector <=> query_embedding) as similarity
    FROM embeddings e
    JOIN messages m ON e.message_id = m.id
    WHERE 1 - (e.vector <=> query_embedding) > match_threshold
    ORDER BY e.vector <=> query_embedding
    LIMIT match_count;
$$;

-- RLSポリシーの作成

-- 候補者ポリシー
CREATE POLICY "候補者は自分の情報を閲覧可能" ON candidates
    FOR SELECT USING (auth.uid()::text = email);

CREATE POLICY "採用担当者は全候補者を閲覧可能" ON candidates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id
            AND raw_user_meta_data->>'role' = 'recruiter'
        )
    );

CREATE POLICY "システムは候補者を作成可能" ON candidates
    FOR INSERT WITH CHECK (true);

-- セッションポリシー
CREATE POLICY "候補者は自分のセッションを閲覧可能" ON sessions
    FOR SELECT USING (
        candidate_id IN (
            SELECT id FROM candidates WHERE email = auth.uid()::text
        )
    );

CREATE POLICY "採用担当者は全セッションを閲覧可能" ON sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id
            AND raw_user_meta_data->>'role' = 'recruiter'
        )
    );

-- メッセージポリシー
CREATE POLICY "候補者は自分のメッセージを閲覧可能" ON messages
    FOR SELECT USING (
        session_id IN (
            SELECT s.id FROM sessions s
            JOIN candidates c ON s.candidate_id = c.id
            WHERE c.email = auth.uid()::text
        )
    );

CREATE POLICY "採用担当者は全メッセージを閲覧可能" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id
            AND raw_user_meta_data->>'role' = 'recruiter'
        )
    );

-- ストレージバケットの作成（Supabase管理画面で実行）
-- INSERT INTO storage.buckets (id, name, public) VALUES ('cv-uploads', 'cv-uploads', false);

-- サンプルデータ（開発用）
-- INSERT INTO candidates (name, email) VALUES ('テスト候補者', 'test@example.com');
