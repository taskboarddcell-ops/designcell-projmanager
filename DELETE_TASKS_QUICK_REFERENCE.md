# Delete Tasks Button - Quick Reference

## What Was Added

### Visual Changes
A new **Delete** button appears in the task list for admin users only.

### Button Location
The Delete button appears in the **Action** column of the task list, alongside:
- Status
- Resched (Reschedule)
- Done
- Edit
- Log

### Button Appearance
- **Color**: Red (btn-danger class)
- **Text**: "Delete"
- **Tooltip**: "Delete task (Admin only)"
- **Visibility**: Only visible to users with Admin access level

## How It Works

### For Admin Users:
1. Login as an admin user
2. Navigate to the Task List view
3. Each task row will show a red "Delete" button
4. Click the Delete button
5. A confirmation dialog appears showing:
   - Project name
   - Task name
   - Warning that the action cannot be undone
6. Click "OK" to confirm deletion or "Cancel" to abort
7. If confirmed, the task is deleted and the view refreshes automatically

### For Non-Admin Users:
- The Delete button is completely hidden
- No access to task deletion functionality

## Security

### Permission Checks:
1. **UI Level**: Button only renders if `isAdmin()` returns true
2. **Logic Level**: Handler verifies admin status before deletion
3. **Confirmation**: User must confirm deletion in a dialog

### Database Operations:
1. Deletes related `task_status_log` entries first
2. Then deletes the task from `tasks` table
3. Maintains referential integrity

## Use Cases

This feature is designed for **cleanup purposes** only:
- Remove duplicate tasks
- Delete test tasks
- Clean up incorrectly created tasks
- Remove obsolete tasks

**Warning**: This is a permanent action. Deleted tasks cannot be recovered.

## Code Files Modified

1. `app/handlers/taskHandlers.ts` - Added deleteTask function
2. `app/handlers/index.ts` - Exported deleteTask
3. `app/ProjectManagerClient.tsx` - Added button and event handler
