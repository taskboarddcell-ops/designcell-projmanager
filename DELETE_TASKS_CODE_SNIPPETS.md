# Delete Tasks Feature - Code Snippets

## 1. Delete Task Handler Function
**File**: `app/handlers/taskHandlers.ts`

```typescript
/**
 * Delete a task (Admin only)
 */
export async function deleteTask(
    supabase: SupabaseClient,
    taskId: string
): Promise<{ success: boolean; error?: string }> {
    logger.info('Deleting task', { taskId });

    try {
        // First delete related task status logs
        const { error: logError } = await supabase
            .from('task_status_log')
            .delete()
            .eq('task_id', taskId);

        if (logError) {
            logger.warn('Failed to delete task logs', logError);
            // Continue anyway - logs are not critical
        }

        // Delete the task itself
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId);

        if (error) {
            logger.error('Task deletion failed', error);
            return { success: false, error: error.message };
        }

        logger.info('Task deleted successfully');
        return { success: true };
    } catch (err: any) {
        logger.error('Task deletion exception', err);
        return { success: false, error: err.message || 'Unknown error' };
    }
}
```

## 2. Delete Button in Task List
**File**: `app/ProjectManagerClient.tsx` (in renderTasks function)

```typescript
<td style="text-align:right; display:flex; gap:4px; justify-content:flex-end; flex-wrap:wrap;">
  <button class="btn-sm act-status" data-id="${esc(t.id)}">Status</button>
  <button class="btn-sm act-reschedule" data-id="${esc(t.id)}">Resched</button>
  <button class="btn-sm act-complete" data-id="${esc(t.id)}">Done</button>
  <button class="btn-sm act-edit" data-id="${esc(t.id)}">Edit</button>
  <button class="btn-sm act-history" data-id="${esc(t.id)}">Log</button>
  ${isAdmin() ? `<button class="btn-sm btn-danger act-delete" data-id="${esc(t.id)}" title="Delete task (Admin only)">Delete</button>` : ''}
</td>
```

**Key Points:**
- Uses conditional rendering: `${isAdmin() ? ... : ''}`
- Only renders if current user is an admin
- Uses `btn-danger` class for red styling
- Has `act-delete` class for event handling
- Includes tooltip for clarity

## 3. Delete Event Handler
**File**: `app/ProjectManagerClient.tsx` (in tasksBody event listener)

```typescript
} else if (target.classList.contains('act-delete')) {
  // Delete task - Admin only
  if (!isAdmin()) {
    toast('Only admins can delete tasks');
    return;
  }

  // Confirm deletion
  const confirmMsg = `Are you sure you want to delete this task?\n\nProject: ${task.project_name}\nTask: ${task.task}\n\nThis action cannot be undone.`;
  if (!confirm(confirmMsg)) {
    return;
  }

  // Delete the task
  (async () => {
    const result = await deleteTask(supabase, task.id);
    
    if (result.success) {
      toast('Task deleted successfully');
      // Remove from local tasks array
      const idx = tasks.findIndex((t) => t.id === task.id);
      if (idx !== -1) {
        tasks.splice(idx, 1);
      }
      // Re-render the task list
      renderTasks();
      renderKanban();
    } else {
      toast('Failed to delete task: ' + (result.error || 'Unknown error'));
    }
  })();
}
```

**Key Features:**
- Double-checks admin permission
- Shows confirmation dialog with task details
- Handles async deletion
- Updates local state on success
- Re-renders both task list and Kanban board
- Shows appropriate toast messages

## 4. Import Statement
**File**: `app/ProjectManagerClient.tsx`

```typescript
import {
  // Types
  Task, Project, User, AssignState,

  // Utilities
  esc, formatDate, getProjectYear, isAdmin,

  // Task Handlers
  createTask, updateTask, deleteTask, bulkAssignTasks,  // <-- deleteTask added here

  // Project Handlers
  fetchProjects, sortProjectsByYear, filterProjectsByYear,

  // User Handlers
  loginUser, loadSession, saveSession, clearSession,
  getAssignableUsers
} from './handlers';
```

## 5. Export Statement
**File**: `app/handlers/index.ts`

```typescript
// Task handlers
export {
    createTask,
    updateTask,
    deleteTask,  // <-- Added this export
    bulkAssignTasks,
    updateTaskStatus,
    canUserAssignTasks,
    getAssignableUsers,
    type TaskCreateParams,
    type TaskUpdateParams,
    type BulkAssignParams,
    type BulkAssignResult,
} from './taskHandlers';
```

## Testing the Feature

### As Admin:
1. Login with admin credentials
2. Go to Task List view
3. Look for the red "Delete" button on any task
4. Click it and confirm the deletion
5. Verify the task disappears from both list and Kanban views

### As Non-Admin:
1. Login with Designer or Team Leader credentials
2. Go to Task List view
3. Verify NO "Delete" button appears
4. All other buttons should work normally

### Database Verification:
```sql
-- Check if task was deleted
SELECT * FROM tasks WHERE id = '<task_id>';

-- Check if related logs were deleted
SELECT * FROM task_status_log WHERE task_id = '<task_id>';
```

Both queries should return no results after deletion.
