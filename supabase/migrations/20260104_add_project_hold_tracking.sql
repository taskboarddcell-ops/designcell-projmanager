-- Add project hold tracking columns
-- Migration: Track when projects are put on hold and resumed
-- Date: 2026-01-04

-- Add on_hold_since column (timestamp when project was put on hold)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS on_hold_since TIMESTAMPTZ;

-- Add hold_duration column (total days the project has been on hold)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS hold_duration INTEGER DEFAULT 0;

-- Add last_resumed_at column (timestamp when project was last resumed)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS last_resumed_at TIMESTAMPTZ;

-- Create index on project_status for faster filtering
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(project_status);

-- Comment on columns
COMMENT ON COLUMN projects.on_hold_since IS 'Timestamp when the project was put on hold (NULL if not on hold)';
COMMENT ON COLUMN projects.hold_duration IS 'Total number of days the project has been on hold (cumulative)';
COMMENT ON COLUMN projects.last_resumed_at IS 'Timestamp when the project was last resumed from hold';
