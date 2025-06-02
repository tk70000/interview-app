CREATE TABLE IF NOT EXISTS interview_availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID REFERENCES candidates(id) NOT NULL,
  available_dates JSONB NOT NULL,
  phone_number VARCHAR(20),
  additional_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);