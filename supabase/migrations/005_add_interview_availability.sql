-- 面接可能日テーブル
CREATE TABLE IF NOT EXISTS interview_availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID REFERENCES candidates(id) NOT NULL,
  available_dates JSONB NOT NULL,
  additional_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_interview_availability_candidate_id ON interview_availability(candidate_id);
CREATE INDEX idx_interview_availability_submitted_at ON interview_availability(submitted_at);

-- RLSポリシー
ALTER TABLE interview_availability ENABLE ROW LEVEL SECURITY;

-- ポリシー: サービスロールのみアクセス可能
CREATE POLICY "Service role can manage interview availability" ON interview_availability
  FOR ALL USING (true);