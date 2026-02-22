-- Add per-visitor question limit columns to sessions table
ALTER TABLE sessions ADD COLUMN max_questions_per_visitor INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN rate_limit_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN rate_limit_window INTEGER DEFAULT 60;

-- Add composite index for efficient quota counting
CREATE INDEX IF NOT EXISTS idx_questions_session_author_created
  ON questions(session_id, author_id, created_at);
