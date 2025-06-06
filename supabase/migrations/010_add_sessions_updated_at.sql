-- sessionsテーブルにupdated_atカラムを追加

-- updated_atカラムを追加
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 既存のレコードにもupdated_atの値を設定
UPDATE sessions 
SET updated_at = COALESCE(ended_at, started_at, CURRENT_TIMESTAMP)
WHERE updated_at IS NULL;

-- updated_atの自動更新トリガーを追加
CREATE TRIGGER update_sessions_updated_at
BEFORE UPDATE ON sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();