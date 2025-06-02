-- candidatesテーブルにデモユーザー識別用カラムを追加
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS is_demo_user BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS demo_session_id UUID DEFAULT gen_random_uuid();

-- 既存のemailのunique制約を削除
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_email_key;

-- デモユーザー以外のメールのunique制約を作成
CREATE UNIQUE INDEX candidates_email_unique_non_demo 
ON candidates (email) 
WHERE is_demo_user = FALSE;

-- デモユーザー向けのインデックス（demo_session_idでユニーク）
CREATE UNIQUE INDEX candidates_demo_session_unique 
ON candidates (demo_session_id) 
WHERE is_demo_user = TRUE;

-- 既存のメールインデックスを削除（新しいものを作成するため）
DROP INDEX IF EXISTS idx_candidates_email;

-- デモユーザー識別用の新しいインデックス
CREATE INDEX idx_candidates_email_demo ON candidates(email, is_demo_user);
CREATE INDEX idx_candidates_demo_session_id ON candidates(demo_session_id);

-- デモユーザーのクリーンアップ用関数
CREATE OR REPLACE FUNCTION cleanup_demo_users()
RETURNS void AS $$
BEGIN
    -- 1日以上前のデモユーザーデータを削除
    DELETE FROM candidates 
    WHERE is_demo_user = TRUE 
    AND created_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- RLSポリシーを更新（デモユーザー対応）
DROP POLICY IF EXISTS "候補者は自分の情報を閲覧可能" ON candidates;
DROP POLICY IF EXISTS "採用担当者は全候補者を閲覧可能" ON candidates;
DROP POLICY IF EXISTS "システムは候補者を作成可能" ON candidates;

-- 新しいRLSポリシー
CREATE POLICY "候補者は自分の情報を閲覧可能" ON candidates
    FOR SELECT USING (
        auth.uid()::text = email OR 
        (is_demo_user = TRUE AND demo_session_id::text = current_setting('app.demo_session_id', true))
    );

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

CREATE POLICY "システムは候補者を更新可能" ON candidates
    FOR UPDATE WITH CHECK (true);