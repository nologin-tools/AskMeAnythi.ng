-- Reports table for content reporting
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  reporter_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  UNIQUE(target_type, target_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_reports_session ON reports (session_id, status);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports (target_type, target_id);
