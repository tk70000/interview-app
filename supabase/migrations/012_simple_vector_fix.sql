-- シンプルなベクトルマッチング関数に修正

-- 既存の関数を削除
DROP FUNCTION IF EXISTS match_jobs_for_candidate(UUID, UUID, INT);
DROP FUNCTION IF EXISTS vector_avg(vector[]);

-- シンプルなマッチング関数を再作成
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
  v_use_profile BOOLEAN := false;
  v_use_chat BOOLEAN := false;
BEGIN
  -- 候補者のプロファイル埋め込みを取得
  SELECT profile_embedding INTO v_profile_embedding
  FROM candidates
  WHERE id = p_candidate_id;
  
  IF v_profile_embedding IS NOT NULL THEN
    v_use_profile := true;
  END IF;

  -- セッションのチャット埋め込みを取得
  SELECT chat_embedding INTO v_chat_embedding
  FROM sessions
  WHERE id = p_session_id;
  
  IF v_chat_embedding IS NOT NULL THEN
    v_use_chat := true;
  END IF;

  -- どちらの埋め込みもない場合は空の結果を返す
  IF NOT v_use_profile AND NOT v_use_chat THEN
    RETURN;
  END IF;

  -- 類似求人を検索（利用可能なベクトルに基づく）
  IF v_use_profile AND v_use_chat THEN
    -- 両方のベクトルがある場合はプロファイルベクトルを優先
    RETURN QUERY
    SELECT 
      j.id as job_id,
      j.company_name,
      j.job_title,
      1 - (j.embedding <=> v_profile_embedding) as similarity,
      jsonb_build_object(
        'profile_match', 1 - (j.embedding <=> v_profile_embedding),
        'chat_match', 1 - (j.embedding <=> v_chat_embedding),
        'primary_source', 'profile'
      ) as match_reasons
    FROM jobs j
    WHERE j.is_active = true
      AND j.embedding IS NOT NULL
    ORDER BY j.embedding <=> v_profile_embedding
    LIMIT match_count;
    
  ELSIF v_use_profile THEN
    -- プロファイルベクトルのみ
    RETURN QUERY
    SELECT 
      j.id as job_id,
      j.company_name,
      j.job_title,
      1 - (j.embedding <=> v_profile_embedding) as similarity,
      jsonb_build_object(
        'profile_match', 1 - (j.embedding <=> v_profile_embedding),
        'chat_match', NULL,
        'primary_source', 'profile'
      ) as match_reasons
    FROM jobs j
    WHERE j.is_active = true
      AND j.embedding IS NOT NULL
    ORDER BY j.embedding <=> v_profile_embedding
    LIMIT match_count;
    
  ELSE
    -- チャットベクトルのみ
    RETURN QUERY
    SELECT 
      j.id as job_id,
      j.company_name,
      j.job_title,
      1 - (j.embedding <=> v_chat_embedding) as similarity,
      jsonb_build_object(
        'profile_match', NULL,
        'chat_match', 1 - (j.embedding <=> v_chat_embedding),
        'primary_source', 'chat'
      ) as match_reasons
    FROM jobs j
    WHERE j.is_active = true
      AND j.embedding IS NOT NULL
    ORDER BY j.embedding <=> v_chat_embedding
    LIMIT match_count;
  END IF;
END;
$$;