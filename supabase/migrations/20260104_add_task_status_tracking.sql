-- Add task status change restrictions
-- Migration: Add columns to track task status history and enforce restrictions
-- Date: 2026-01-04

-- Add completed_by column (who marked the task as complete)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS completed_by TEXT;

-- Add completed_at column (when the task was completed)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add reschedule_remarks column (remarks when rescheduling)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS reschedule_remarks TEXT;

-- Add previous_status column (to track status changes)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS previous_status TEXT;

-- Create index on completed_at for faster queries
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at);

-- Create index on completed_by for faster queries
CREATE INDEX IF NOT EXISTS idx_tasks_completed_by ON tasks(completed_by);

-- Comment on columns
COMMENT ON COLUMN tasks.completed_by IS 'Staff ID of the user who marked the task as complete';
COMMENT ON COLUMN tasks.completed_at IS 'Timestamp when the task was marked as complete';
COMMENT ON COLUMN tasks.reschedule_remarks IS 'Remarks when task is rescheduled or status changed to Pending';
COMMENT ON COLUMN tasks.previous_status IS 'Previous status before the last change (for audit purposes)';
