-- Add session management fields to sessions table
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS summary TEXT;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- Create table for tracking user's latest sessions
CREATE TABLE IF NOT EXISTS user_latest_sessions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  latest_session_id UUID REFERENCES sessions(id),
  latest_cv_id UUID REFERENCES candidates(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for session metadata
CREATE TABLE IF NOT EXISTS session_metadata (
  session_id UUID PRIMARY KEY REFERENCES sessions(id),
  total_messages INTEGER DEFAULT 0,
  last_message_at TIMESTAMP WITH TIME ZONE,
  ai_summary TEXT,
  topics TEXT[],
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to update session metadata
CREATE OR REPLACE FUNCTION update_session_metadata()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE session_metadata
  SET total_messages = total_messages + 1,
      last_message_at = NOW(),
      updated_at = NOW()
  WHERE session_id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update metadata when message is added
CREATE TRIGGER session_metadata_update_trigger
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_session_metadata();