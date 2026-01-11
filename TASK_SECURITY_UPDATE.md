# Task Management Security Update - Summary

## Date: 2026-01-11

## Changes Implemented

### 1. Removed Standalone Task Creation
**Problem:** Users were creating tasks with custom descriptions/titles outside the project structure, causing confusion and data integrity issues.

**Solution:**
- Removed the "+ Task" button from the sidebar
- Removed the task description input field from the Assign Task modal
- Tasks can now ONLY be created through the project structure (stage/sub-stage)

### 2. Automatic Task Title Generation
**Problem:** Users were entering descriptions in the "task title" field, leading to inconsistent task naming.

**Solution:**
- Task titles are now automatically derived from the selected stage and sub-stage
- Example: If stage is "Civil Works" and sub-stage is "Concrete grade", the task title will be "Concrete grade"
- This ensures all tasks follow the defined project structure

### 3. Restricted Task Editing Permissions
**Problem:** Regular users were editing tasks and changing task names to things like "complete" instead of using the status field.

**Solution:**
- **ONLY Admins and Project Leads** can now edit tasks
- Removed the "creator can edit their own task" permission
- Regular users can only view and update the status of tasks assigned to them

## Impact

### For Admins and Project Leads:
- ✅ Full control over task creation and editing
- ✅ Can create tasks through project structure
- ✅ Can modify any task in their projects

### For Regular Users (Designers, etc.):
- ❌ Cannot create new tasks
- ❌ Cannot edit task details (title, due date, priority, assignees)
- ✅ Can update task status (Pending → In Progress → Complete)
- ✅ Can view all tasks assigned to them

## Data Integrity Improvements

1. **Consistent Task Naming:** All tasks now follow the project structure naming convention
2. **No Orphan Tasks:** Tasks cannot be created outside the project structure
3. **Controlled Editing:** Only authorized users can modify task details
4. **Audit Trail:** All task modifications are now limited to admins/leads, making it easier to track changes

---

## Recommended Actions for Supabase Database Cleanup

### 1. Identify Tasks with Anomalous Titles

Run this query to find tasks that don't match their stage/sub-stage structure:

```sql
SELECT 
  id,
  task,
  project_name,
  stage_id,
  sub_id,
  status,
  created_by_id,
  created_at
FROM tasks
WHERE 
  -- Tasks where the title doesn't match the sub_id or stage_id
  (sub_id IS NOT NULL AND task != sub_id)
  OR (sub_id IS NULL AND stage_id IS NOT NULL AND task != stage_id)
  OR task ILIKE '%complete%'  -- Tasks named "complete" or similar
  OR task ILIKE '%done%'
  OR task ILIKE '%finished%'
ORDER BY created_at DESC;
```

### 2. Find Tasks Created Outside Project Structure

```sql
SELECT 
  id,
  task,
  project_name,
  stage_id,
  sub_id,
  description,
  created_by_id,
  created_at
FROM tasks
WHERE 
  stage_id IS NULL 
  OR sub_id IS NULL
ORDER BY created_at DESC;
```

### 3. Identify Tasks with Description as Title

```sql
SELECT 
  id,
  task,
  description,
  project_name,
  created_by_id,
  created_at
FROM tasks
WHERE 
  LENGTH(task) > 50  -- Unusually long titles (likely descriptions)
  OR task LIKE '%?%'  -- Questions marks in title
  OR task LIKE '%...%'  -- Ellipsis in title
ORDER BY created_at DESC;
```

### 4. Find Recently Modified Tasks by Non-Admins/Non-Leads

```sql
SELECT 
  t.id,
  t.task,
  t.project_name,
  t.status,
  t.updated_at,
  t.created_by_id,
  u.name as created_by_name,
  u.role
FROM tasks t
LEFT JOIN users u ON t.created_by_id = u.staff_id
WHERE 
  t.updated_at > t.created_at  -- Task was modified after creation
  AND u.role NOT IN ('Admin', 'Project Lead')
ORDER BY t.updated_at DESC
LIMIT 100;
```

### 5. Check for Status Manipulation

```sql
SELECT 
  id,
  task,
  project_name,
  status,
  completed_at,
  created_by_id,
  updated_at
FROM tasks
WHERE 
  status = 'Complete'
  AND completed_at IS NULL  -- Marked complete but no completion date
ORDER BY updated_at DESC;
```

---

## Recommended Cleanup Actions

### Option 1: Archive Anomalous Tasks
Create a backup table and move problematic tasks:

```sql
-- Create backup table
CREATE TABLE tasks_archive AS 
SELECT * FROM tasks WHERE 1=0;

-- Move anomalous tasks to archive
INSERT INTO tasks_archive
SELECT * FROM tasks
WHERE [your anomaly criteria];

-- Delete from main table
DELETE FROM tasks
WHERE id IN (SELECT id FROM tasks_archive);
```

### Option 2: Fix Task Titles
Update task titles to match their structure:

```sql
UPDATE tasks
SET task = sub_id
WHERE sub_id IS NOT NULL AND task != sub_id;

UPDATE tasks
SET task = stage_id
WHERE sub_id IS NULL AND stage_id IS NOT NULL AND task != stage_id;
```

### Option 3: Add Database Constraints
Prevent future anomalies with database-level validation:

```sql
-- Ensure tasks have stage and sub-stage
ALTER TABLE tasks
ADD CONSTRAINT tasks_must_have_structure
CHECK (stage_id IS NOT NULL AND sub_id IS NOT NULL);

-- Ensure task title matches structure
-- (This would need a trigger function)
```

---

## Monitoring Going Forward

### 1. Set up alerts for:
- Tasks created without stage/sub-stage
- Tasks with unusually long titles
- Task edits by non-admin/non-lead users

### 2. Regular audits:
- Weekly review of task creation patterns
- Monthly check for data integrity issues
- Quarterly cleanup of archived/deleted tasks

### 3. User training:
- Educate users on the new workflow
- Emphasize that tasks must be created through project structure
- Clarify that only admins/leads can modify task details

---

## Support and Questions

If you encounter any issues or have questions about these changes:
1. Check the project structure is properly defined for each project
2. Ensure users understand they can only create tasks through "Assign Task" buttons in project structure
3. Verify admin and project lead roles are correctly assigned in the users table

## Rollback Plan (if needed)

If you need to temporarily restore the old behavior:
1. Revert the commit: `git revert 969b09c`
2. Push to main: `git push origin main`
3. The "+ Task" button and description field will be restored
4. Edit permissions will include task creators again
