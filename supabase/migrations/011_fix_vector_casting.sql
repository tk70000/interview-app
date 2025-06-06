-- ベクトルキャスティングエラーを修正

-- 既存の関数を削除して再作成
DROP FUNCTION IF EXISTS match_jobs_for_candidate(UUID, UUID, INT);

-- 修正版の候補者プロファイルと求人のマッチング関数
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
  v_profile_weight FLOAT := 0.6;
  v_chat_weight FLOAT := 0.4;
BEGIN
  -- 候補者のプロファイル埋め込みを取得
  SELECT profile_embedding INTO v_profile_embedding
  FROM candidates
  WHERE id = p_candidate_id;

  -- セッションのチャット埋め込みを取得
  SELECT chat_embedding INTO v_chat_embedding
  FROM sessions
  WHERE id = p_session_id;

  -- 埋め込みベクトルの結合（重み付き平均）
  IF v_profile_embedding IS NOT NULL AND v_chat_embedding IS NOT NULL THEN
    -- 両方のベクトルがある場合は重み付き平均を計算
    -- PostgreSQLでのベクトル演算は直接的な方法を使用
    SELECT vector_avg(ARRAY[v_profile_embedding, v_chat_embedding]) INTO v_combined_embedding;
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
        ELSE NULL END,
      'combined_match', 1 - (j.embedding <=> v_combined_embedding)
    ) as match_reasons
  FROM jobs j
  WHERE j.is_active = true
    AND j.embedding IS NOT NULL
  ORDER BY j.embedding <=> v_combined_embedding
  LIMIT match_count;
END;
$$;

-- ベクトル平均計算のヘルパー関数を作成
CREATE OR REPLACE FUNCTION vector_avg(vectors vector[])
RETURNS vector
LANGUAGE plpgsql
AS $$
DECLARE
  result_vector vector;
  vector_count INT;
  i INT;
  temp_sum FLOAT[];
  temp_vector FLOAT[];
BEGIN
  vector_count := array_length(vectors, 1);
  
  IF vector_count = 0 OR vectors IS NULL THEN
    RETURN NULL;
  END IF;
  
  IF vector_count = 1 THEN
    RETURN vectors[1];
  END IF;
  
  -- 最初のベクトルで初期化
  temp_sum := vectors[1]::FLOAT[];
  
  -- 残りのベクトルを加算
  FOR i IN 2..vector_count LOOP
    temp_vector := vectors[i]::FLOAT[];
    FOR j IN 1..array_length(temp_sum, 1) LOOP
      temp_sum[j] := temp_sum[j] + temp_vector[j];
    END LOOP;
  END LOOP;
  
  -- 平均を計算
  FOR j IN 1..array_length(temp_sum, 1) LOOP
    temp_sum[j] := temp_sum[j] / vector_count;
  END LOOP;
  
  RETURN temp_sum::vector;
END;
$$;