-- 求人マッチング機能用のテーブル作成

-- pgvector拡張機能を有効化（まだの場合）
CREATE EXTENSION IF NOT EXISTS vector;

-- 求人情報テーブル
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  department TEXT,
  job_description TEXT NOT NULL,
  requirements TEXT,
  skills JSONB DEFAULT '[]'::jsonb,
  employment_type TEXT,
  location TEXT,
  salary_range JSONB,
  file_path TEXT,
  file_name TEXT,
  raw_content TEXT,
  parsed_data JSONB,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- インデックス作成
CREATE INDEX idx_jobs_company ON jobs(company_name);
CREATE INDEX idx_jobs_title ON jobs(job_title);
CREATE INDEX idx_jobs_is_active ON jobs(is_active);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

-- ベクトル検索用のインデックス（IVFFlat）
-- 注: データが1000件以上になってから作成することを推奨
-- CREATE INDEX idx_jobs_embedding ON jobs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 求人マッチング履歴テーブル
CREATE TABLE IF NOT EXISTS job_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  candidate_id UUID REFERENCES candidates(id),
  job_id UUID REFERENCES jobs(id),
  similarity_score FLOAT NOT NULL,
  match_reason TEXT,
  ranking INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_job_matches_session ON job_matches(session_id);
CREATE INDEX idx_job_matches_candidate ON job_matches(candidate_id);
CREATE INDEX idx_job_matches_job ON job_matches(job_id);
CREATE INDEX idx_job_matches_created_at ON job_matches(created_at DESC);

-- 候補者プロファイルの拡張（チャット要約を保存）
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS profile_summary TEXT,
ADD COLUMN IF NOT EXISTS profile_embedding vector(1536),
ADD COLUMN IF NOT EXISTS skills_extracted JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- セッションの拡張（チャット要約の保存）
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS chat_summary TEXT,
ADD COLUMN IF NOT EXISTS chat_embedding vector(1536),
ADD COLUMN IF NOT EXISTS extracted_requirements JSONB DEFAULT '{}'::jsonb;

-- RLSポリシー設定
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_matches ENABLE ROW LEVEL SECURITY;

-- 管理者のみjobsテーブルにアクセス可能
CREATE POLICY "Admin can manage jobs" ON jobs
  FOR ALL USING (true);

-- 候補者は自分のマッチング結果のみ閲覧可能
CREATE POLICY "Candidates can view own job matches" ON job_matches
  FOR SELECT USING (
    candidate_id IN (
      SELECT id FROM candidates 
      WHERE email = auth.email()
    )
  );

-- 管理者は全てのマッチング結果を閲覧可能
CREATE POLICY "Admin can view all job matches" ON job_matches
  FOR ALL USING (true);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ベクトル類似度検索関数
CREATE OR REPLACE FUNCTION match_jobs(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  job_id UUID,
  company_name TEXT,
  job_title TEXT,
  department TEXT,
  similarity FLOAT
)
LANGUAGE sql
AS $$
  SELECT 
    id as job_id,
    company_name,
    job_title,
    department,
    1 - (embedding <=> query_embedding) as similarity
  FROM jobs
  WHERE is_active = true
    AND embedding IS NOT NULL
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 候補者プロファイルと求人のマッチング関数
CREATE OR REPLACE FUNCTION match_jobs_for_candidate(
  p_candidate_id UUID,
  p_session_id UUID,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  job_id UUID,
  company_name TEXT,
  job_title TEXT,
  similarity FLOAT,
  match_reasons JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_profile_embedding vector(1536);
  v_chat_embedding vector(1536);
  v_combined_embedding vector(1536);
BEGIN
  -- 候補者のプロファイル埋め込みを取得
  SELECT profile_embedding INTO v_profile_embedding
  FROM candidates
  WHERE id = p_candidate_id;

  -- セッションのチャット埋め込みを取得
  SELECT chat_embedding INTO v_chat_embedding
  FROM sessions
  WHERE id = p_session_id;

  -- 埋め込みベクトルの結合（平均）
  IF v_profile_embedding IS NOT NULL AND v_chat_embedding IS NOT NULL THEN
    v_combined_embedding := ((v_profile_embedding::float[] + v_chat_embedding::float[]) / 2.0)::vector;
  ELSIF v_profile_embedding IS NOT NULL THEN
    v_combined_embedding := v_profile_embedding;
  ELSIF v_chat_embedding IS NOT NULL THEN
    v_combined_embedding := v_chat_embedding;
  ELSE
    -- 埋め込みがない場合は空の結果を返す
    RETURN;
  END IF;

  -- 類似求人を検索
  RETURN QUERY
  SELECT 
    j.id as job_id,
    j.company_name,
    j.job_title,
    1 - (j.embedding <=> v_combined_embedding) as similarity,
    jsonb_build_object(
      'profile_match', CASE WHEN v_profile_embedding IS NOT NULL 
        THEN 1 - (j.embedding <=> v_profile_embedding) 
        ELSE NULL END,
      'chat_match', CASE WHEN v_chat_embedding IS NOT NULL 
        THEN 1 - (j.embedding <=> v_chat_embedding) 
        ELSE NULL END
    ) as match_reasons
  FROM jobs j
  WHERE j.is_active = true
    AND j.embedding IS NOT NULL
  ORDER BY j.embedding <=> v_combined_embedding
  LIMIT match_count;
END;
$$;

-- コメント追加
COMMENT ON TABLE jobs IS '求人情報';
COMMENT ON TABLE job_matches IS '求人マッチング履歴';
COMMENT ON COLUMN jobs.embedding IS 'OpenAI embeddingsによるベクトル表現';
COMMENT ON COLUMN candidates.profile_embedding IS 'CV情報のベクトル表現';
COMMENT ON COLUMN sessions.chat_embedding IS 'チャット履歴のベクトル表現';
COMMENT ON FUNCTION match_jobs IS 'ベクトル類似度による求人検索';
COMMENT ON FUNCTION match_jobs_for_candidate IS '候補者プロファイルに基づく求人マッチング';