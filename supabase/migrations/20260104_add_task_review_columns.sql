-- Add review-related columns to tasks table
-- Migration: Add task review system columns
-- Date: 2026-01-04

-- Add reviewed_by column (stores staff_id of the reviewer)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS reviewed_by TEXT;

-- Add reviewed_at column (timestamp when review was completed)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Add review_comments column (feedback from reviewer)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS review_comments TEXT;

-- Add completion_remarks column (remarks from assignee when completing)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS completion_remarks TEXT;

-- Create index on reviewed_by for faster queries
CREATE INDEX IF NOT EXISTS idx_tasks_reviewed_by ON tasks(reviewed_by);

-- Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Comment on columns
COMMENT ON COLUMN tasks.reviewed_by IS 'Staff ID of the user assigned to review this task';
COMMENT ON COLUMN tasks.reviewed_at IS 'Timestamp when the task review was completed';
COMMENT ON COLUMN tasks.review_comments IS 'Feedback or comments from the reviewer';
COMMENT ON COLUMN tasks.completion_remarks IS 'Remarks from assignee about what was completed';
