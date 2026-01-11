-- Backfill revision counts from task_status_log
-- This calculates the actual number of times each task was sent for revision
-- Date: 2026-01-11

-- Calculate and update revision counts based on historical data
WITH revision_counts AS (
  SELECT 
    task_id,
    COUNT(*) as actual_revision_count
  FROM task_status_log
  WHERE to_status = 'Needs Revision'
  GROUP BY task_id
)
UPDATE tasks
SET revision_count = COALESCE(rc.actual_revision_count, 0)
FROM revision_counts rc
WHERE tasks.id = rc.task_id;

-- Create a function to recalculate revision count for a specific task
CREATE OR REPLACE FUNCTION recalculate_task_revision_count(task_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  rev_count INTEGER;
BEGIN
  -- Count revisions from log
  SELECT COUNT(*) INTO rev_count
  FROM task_status_log
  WHERE task_id = task_uuid AND to_status = 'Needs Revision';
  
  -- Update the task
  UPDATE tasks
  SET revision_count = rev_count
  WHERE id = task_uuid;
  
  RETURN rev_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalculate_task_revision_count IS 'Recalculates the revision count for a specific task based on task_status_log entries';
