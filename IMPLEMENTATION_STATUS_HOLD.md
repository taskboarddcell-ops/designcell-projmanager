# Task Status Restrictions & Project Hold Management

## Implementation Summary
**Date:** 2026-01-04  
**Status:** ✅ Complete

This document outlines the implementation of two key features:
1. **Task Status Restrictions** - Prevent non-admin users from reverting completed tasks
2. **Project Hold Management** - Smart handling of projects put on hold and resumed

---

## 1. Task Status Restrictions

### Overview
Once a task is marked as "Complete", only administrators can change it back to "Pending" or "In Progress". This prevents accidental status reversals and maintains data integrity.

### Database Changes
**Migration:** `20260104_add_task_status_tracking.sql`

New columns added to `tasks` table:
- `completed_by` (TEXT) - Staff ID who marked task complete
- `completed_at` (TIMESTAMPTZ) - Timestamp of completion
- `reschedule_remarks` (TEXT) - Remarks when rescheduling
- `previous_status` (TEXT) - Previous status for audit trail

### Code Changes

#### New Permission Function
**File:** `app/handlers/types.ts`

```typescript
export function canUserChangeTaskStatus(
    user: User | null,
    task: Task | null,
    newStatus: string
): { allowed: boolean; reason?: string }
```

**Logic:**
- If task status is "Complete" AND new status is "Pending" or "In Progress"
  - Only admins can proceed
  - Non-admins receive error: "Only administrators can revert completed tasks..."
- All other status changes are allowed

#### Updated Handler
**File:** `app/handlers/taskHandlers.ts`

`updateTaskStatus()` function enhanced to:
1. Fetch current task before updating
2. Check permissions using `canUserChangeTaskStatus()`
3. Store `previous_status` for audit trail
4. Return permission error if not allowed

### User Experience
- **Regular Users:** Cannot revert completed tasks; see clear error message
- **Admins:** Can make any status change (for corrections/exceptions)
- **All Users:** Can still use the review system for requesting revisions

---

## 2. Project Hold Management

### Overview
When a project is put "On Hold", tasks are filtered from views. When resumed, users can choose to automatically shift task due dates forward by the hold duration.

### Database Changes
**Migration:** `20260104_add_project_hold_tracking.sql`

New columns added to `projects` table:
- `on_hold_since` (TIMESTAMPTZ) - When project was put on hold
- `hold_duration` (INTEGER) - Cumulative days on hold
- `last_resumed_at` (TIMESTAMPTZ) - When last resumed

### Code Changes

#### Enhanced Project Status Handler
**File:** `app/handlers/projectHandlers.ts`

`updateProjectStatus()` function now:

**When putting project "On Hold":**
- Sets `on_hold_since` to current timestamp
- Logs the hold event

**When resuming from "On Hold":**
- Calculates days on hold
- Adds to cumulative `hold_duration`
- Sets `last_resumed_at` timestamp
- Clears `on_hold_since`
- Returns `holdDuration` for UI

#### New Task Date Adjustment Function
**File:** `app/handlers/projectHandlers.ts`

```typescript
export async function adjustTaskDatesAfterHold(
    supabase: SupabaseClient,
    projectId: string,
    daysToShift: number
): Promise<{ success: boolean; updatedCount: number; error?: string }>
```

**Logic:**
1. Fetches all Pending/In Progress tasks for the project
2. Shifts each task's due date forward by `daysToShift` days
3. Returns count of updated tasks

### UI Components

#### Project Resume Modal
**File:** `app/ProjectManagerClient.tsx`

New modal `#projectResumeModal` displays:
- Project name
- Hold start date
- Duration in days
- Count of affected tasks

**User Options:**
1. **Shift all due dates forward** (recommended, default)
   - Automatically adds hold duration to all pending/in-progress tasks
   - Maintains relative timeline
2. **Keep original due dates**
   - Tasks retain original deadlines
   - User can manually adjust if needed

### Workflow

#### Putting Project On Hold
1. Admin/Lead changes project status to "On Hold"
2. System records `on_hold_since` timestamp
3. Tasks remain in database but are filtered from views
4. Completed tasks are unaffected

#### Resuming Project
1. Admin/Lead changes status to "Ongoing"
2. System calculates hold duration
3. **Project Resume Modal** appears with:
   - Hold summary information
   - Two radio button options
4. User selects option and clicks "Resume Project"
5. If "Shift dates" selected:
   - System calls `adjustTaskDatesAfterHold()`
   - All pending/in-progress task due dates shift forward
6. Tasks become visible again in all views

### Benefits

✅ **No Data Loss** - All tasks preserved in database  
✅ **Simple UX** - One decision, not per-task  
✅ **Preserves History** - Original dates tracked via hold_duration  
✅ **Automatic Timeline Adjustment** - Optional smart date shifting  
✅ **Flexibility** - Users can choose to keep original dates  
✅ **Audit Trail** - Full tracking of hold periods

---

## Testing Checklist

### Task Status Restrictions
- [ ] Regular user cannot change Complete → Pending
- [ ] Regular user cannot change Complete → In Progress
- [ ] Admin can change Complete → Pending
- [ ] Admin can change Complete → In Progress
- [ ] Error message displays correctly for non-admins
- [ ] Previous status is tracked in database

### Project Hold Management
- [ ] Project status can be changed to "On Hold"
- [ ] `on_hold_since` timestamp is recorded
- [ ] Tasks are filtered from views when project on hold
- [ ] Completed tasks remain visible
- [ ] Resume modal appears when changing from "On Hold" to "Ongoing"
- [ ] Hold duration is calculated correctly
- [ ] Task count is accurate in modal
- [ ] "Shift dates" option works correctly
- [ ] "Keep dates" option works correctly
- [ ] `hold_duration` accumulates correctly for multiple holds
- [ ] `last_resumed_at` is updated

---

## Database Migration Instructions

Run these migrations in order:

```bash
# 1. Task status tracking
psql -d your_database -f supabase/migrations/20260104_add_task_status_tracking.sql

# 2. Project hold tracking
psql -d your_database -f supabase/migrations/20260104_add_project_hold_tracking.sql
```

Or if using Supabase CLI:
```bash
supabase db push
```

---

## Future Enhancements (Optional)

1. **Notification System**
   - Notify team when project is put on hold
   - Notify team when project is resumed

2. **Hold Reason Field**
   - Add `hold_reason` column to track why project was paused
   - Display in resume modal

3. **Partial Date Adjustment**
   - Allow users to specify custom shift duration
   - Different shifts for different task priorities

4. **Hold History**
   - Track multiple hold/resume cycles
   - Display timeline of all holds

5. **Automatic Notifications**
   - Email stakeholders when project status changes
   - Weekly reminders for projects on hold > 30 days

---

## Notes

- The implementation uses the **Soft Hide + Date Offset** approach (Option B + D from recommendations)
- All changes are backward compatible
- No breaking changes to existing functionality
- Migrations are idempotent (safe to run multiple times)
