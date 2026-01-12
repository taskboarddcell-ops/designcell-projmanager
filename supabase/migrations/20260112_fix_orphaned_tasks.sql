-- Cleanup Migration: Assign orphaned tasks to Project Leads
-- Detected ~48 tasks with no assignees.
-- Logic:
-- 1. Identify tasks with empty/null assignee_ids
-- 2. Find the parent project
-- 3. If project has leads, copy lead_ids -> task.assignee_ids
-- 4. Update task.assignees (names) by looking up users table

UPDATE tasks t
SET 
  assignee_ids = p.lead_ids,
  assignees = (
    SELECT array_agg(u.name)
    FROM users u
    WHERE u.staff_id = ANY(p.lead_ids)
  )
FROM projects p
WHERE t.project_id = p.id
  AND (t.assignee_ids IS NULL OR cardinality(t.assignee_ids) = 0)
  AND p.lead_ids IS NOT NULL
  AND cardinality(p.lead_ids) > 0;
