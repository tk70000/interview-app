-- 🚨 緊急修正: セキュリティ脆弱性対応
-- このマイグレーションはセキュリティ分析で発見された重要な問題を修正します

-- 1. 既存のRLSポリシーを削除（正しく動作していない）
DROP POLICY IF EXISTS "候補者は自分の情報を閲覧可能" ON candidates;
DROP POLICY IF EXISTS "採用担当者は全候補者を閲覧可能" ON candidates;
DROP POLICY IF EXISTS "システムは候補者を作成可能" ON candidates;
DROP POLICY IF EXISTS "候補者は自分のセッションを閲覧可能" ON sessions;
DROP POLICY IF EXISTS "採用担当者は全セッションを閲覧可能" ON sessions;
DROP POLICY IF EXISTS "候補者は自分のメッセージを閲覧可能" ON messages;
DROP POLICY IF EXISTS "採用担当者は全メッセージを閲覧可能" ON messages;

-- 2. candidatesテーブルにuser_idカラムを追加（認証との紐付け用）
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. user_idカラムのインデックスを追加
CREATE INDEX IF NOT EXISTS idx_candidates_user_id ON candidates(user_id);

-- 4. 修正されたRLSポリシーを作成

-- 候補者テーブルのポリシー
CREATE POLICY "candidates_select_own_data" ON candidates
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "candidates_insert_own_data" ON candidates
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "candidates_update_own_data" ON candidates
    FOR UPDATE USING (user_id = auth.uid());

-- 採用担当者は全候補者データを閲覧可能
CREATE POLICY "candidates_select_for_recruiters" ON candidates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.raw_user_meta_data->>'role') = 'recruiter'
        )
    );

-- セッションテーブルのポリシー
CREATE POLICY "sessions_select_own_data" ON sessions
    FOR SELECT USING (
        candidate_id IN (
            SELECT id FROM candidates WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "sessions_insert_own_data" ON sessions
    FOR INSERT WITH CHECK (
        candidate_id IN (
            SELECT id FROM candidates WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "sessions_update_own_data" ON sessions
    FOR UPDATE USING (
        candidate_id IN (
            SELECT id FROM candidates WHERE user_id = auth.uid()
        )
    );

-- 採用担当者は全セッションを閲覧可能
CREATE POLICY "sessions_select_for_recruiters" ON sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.raw_user_meta_data->>'role') = 'recruiter'
        )
    );

-- メッセージテーブルのポリシー
CREATE POLICY "messages_select_own_data" ON messages
    FOR SELECT USING (
        session_id IN (
            SELECT s.id FROM sessions s
            JOIN candidates c ON s.candidate_id = c.id
            WHERE c.user_id = auth.uid()
        )
    );

CREATE POLICY "messages_insert_own_data" ON messages
    FOR INSERT WITH CHECK (
        session_id IN (
            SELECT s.id FROM sessions s
            JOIN candidates c ON s.candidate_id = c.id
            WHERE c.user_id = auth.uid()
        )
    );

-- 採用担当者は全メッセージを閲覧可能
CREATE POLICY "messages_select_for_recruiters" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.raw_user_meta_data->>'role') = 'recruiter'
        )
    );

-- 埋め込みベクトルテーブルのポリシー
CREATE POLICY "embeddings_select_own_data" ON embeddings
    FOR SELECT USING (
        message_id IN (
            SELECT m.id FROM messages m
            JOIN sessions s ON m.session_id = s.id
            JOIN candidates c ON s.candidate_id = c.id
            WHERE c.user_id = auth.uid()
        )
    );

CREATE POLICY "embeddings_insert_own_data" ON embeddings
    FOR INSERT WITH CHECK (
        message_id IN (
            SELECT m.id FROM messages m
            JOIN sessions s ON m.session_id = s.id
            JOIN candidates c ON s.candidate_id = c.id
            WHERE c.user_id = auth.uid()
        )
    );

-- 採用担当者は全埋め込みベクトルを閲覧可能
CREATE POLICY "embeddings_select_for_recruiters" ON embeddings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.raw_user_meta_data->>'role') = 'recruiter'
        )
    );

-- 5. ストレージポリシーの修正（プライベートアクセス）
-- cv-uploadsバケットのポリシー
-- 注意: これはSupabase管理画面で実行する必要があります

/*
Supabase管理画面 > Storage > cv-uploads > Policies で以下を設定:

1. SELECT ポリシー:
名前: "Users can view own CV files"
対象: SELECT
条件: 
```
(bucket_id = 'cv-uploads') AND 
((storage.foldername(name))[1] IN 
 (SELECT c.id::text FROM candidates c WHERE c.user_id = auth.uid()))
```

2. INSERT ポリシー:
名前: "Users can upload own CV files"
対象: INSERT
条件:
```
(bucket_id = 'cv-uploads') AND 
((storage.foldername(name))[1] IN 
 (SELECT c.id::text FROM candidates c WHERE c.user_id = auth.uid()))
```

3. UPDATE ポリシー:
名前: "Users can update own CV files"
対象: UPDATE
条件:
```
(bucket_id = 'cv-uploads') AND 
((storage.foldername(name))[1] IN 
 (SELECT c.id::text FROM candidates c WHERE c.user_id = auth.uid()))
```

4. DELETE ポリシー:
名前: "Users can delete own CV files"
対象: DELETE
条件:
```
(bucket_id = 'cv-uploads') AND 
((storage.foldername(name))[1] IN 
 (SELECT c.id::text FROM candidates c WHERE c.user_id = auth.uid()))
```
*/

-- 6. セキュリティ監査用のビュー作成
CREATE OR REPLACE VIEW security_audit_view AS
SELECT 
    'candidates' as table_name,
    id,
    user_id,
    email,
    created_at,
    CASE 
        WHEN user_id IS NULL THEN 'Missing user_id'
        ELSE 'OK'
    END as security_status
FROM candidates
WHERE user_id IS NULL

UNION ALL

SELECT 
    'sessions' as table_name,
    s.id,
    c.user_id,
    c.email,
    s.created_at,
    CASE 
        WHEN c.user_id IS NULL THEN 'Orphaned session'
        ELSE 'OK'
    END as security_status
FROM sessions s
LEFT JOIN candidates c ON s.candidate_id = c.id
WHERE c.user_id IS NULL;

-- 7. セキュリティ関数: 機密データのマスキング
CREATE OR REPLACE FUNCTION mask_email(email_input TEXT)
RETURNS TEXT AS $$
BEGIN
    IF email_input IS NULL OR LENGTH(email_input) < 3 THEN
        RETURN '***';
    END IF;
    
    RETURN SUBSTRING(email_input, 1, 2) || '***@' || 
           SUBSTRING(email_input FROM '@(.*)$');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 監査ログテーブル（セキュリティイベント記録用）
CREATE TABLE IF NOT EXISTS security_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL, -- 'LOGIN', 'DATA_ACCESS', 'FILE_UPLOAD', etc.
    user_id UUID REFERENCES auth.users(id),
    ip_address INET,
    user_agent TEXT,
    resource_accessed TEXT,
    event_details JSONB,
    risk_level VARCHAR(10) CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 監査ログのインデックス
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON security_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_risk_level ON security_audit_log(risk_level);

-- 9. データ保持期間の制約（プライバシー保護）
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- 90日以上古いセッションを削除
    DELETE FROM sessions 
    WHERE ended_at IS NOT NULL 
    AND ended_at < NOW() - INTERVAL '90 days';
    
    -- 1年以上古い監査ログを削除
    DELETE FROM security_audit_log 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    -- 孤立したembeddingsを削除
    DELETE FROM embeddings 
    WHERE message_id NOT IN (SELECT id FROM messages);
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. 緊急時のセキュリティ無効化関数（管理者専用）
CREATE OR REPLACE FUNCTION emergency_disable_user(target_user_id UUID)
RETURNS void AS $$
BEGIN
    -- ユーザーのセッションを強制終了
    UPDATE sessions 
    SET status = 'timeout', ended_at = NOW()
    WHERE candidate_id IN (
        SELECT id FROM candidates WHERE user_id = target_user_id
    ) AND status = 'active';
    
    -- 監査ログに記録
    INSERT INTO security_audit_log (
        event_type, user_id, event_details, risk_level
    ) VALUES (
        'EMERGENCY_DISABLE', 
        target_user_id, 
        '{"action": "emergency_user_disable", "reason": "security_incident"}',
        'CRITICAL'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 実行確認
SELECT 'Security migration completed successfully' as status;
