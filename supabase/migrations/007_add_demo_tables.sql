-- Create demo candidates table
CREATE TABLE demo_candidates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    cv_url TEXT,
    cv_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Create demo sessions table
CREATE TABLE demo_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    demo_candidate_id UUID REFERENCES demo_candidates(id) ON DELETE CASCADE,
    messages JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster cleanup
CREATE INDEX demo_candidates_expires_at_idx ON demo_candidates(expires_at);