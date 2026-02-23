-- Remove global unique handle index
DROP INDEX IF EXISTS idx_analysis_result_handle;

-- Add user_id column to analysis_result for per-user control
ALTER TABLE analysis_result ADD COLUMN IF NOT EXISTS user_id uuid;

-- Create unique index per (handle, user_id) — allows same handle for different users
CREATE UNIQUE INDEX idx_analysis_result_handle_user
  ON analysis_result(handle, user_id);

-- Remove is_reanalysis column (no reanalysis feature)
ALTER TABLE analysis_result DROP COLUMN IF EXISTS is_reanalysis;