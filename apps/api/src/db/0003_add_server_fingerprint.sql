-- Add server-side fingerprint column to questions table
ALTER TABLE questions ADD COLUMN author_fp TEXT;

CREATE INDEX IF NOT EXISTS idx_questions_author_fp ON questions (session_id, author_fp);
