-- Migration: Relax notification types check constraint
-- This allows more descriptive notification types used by the application

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'TASK_ASSIGNED', 
  'TASK_STATUS_UPDATE', 
  'TASK_REVISION_REQUESTED', 
  'TASK_REJECTED', 
  'TASK_SUBMITTED_FOR_REVIEW', 
  'TASK_REVIEW_ACCEPTED', 
  'TASK_REVIEW_REJECTED'
));

-- Add comment for documentation
COMMENT ON CONSTRAINT notifications_type_check ON notifications IS 'Restricts notification types to known application states.';
