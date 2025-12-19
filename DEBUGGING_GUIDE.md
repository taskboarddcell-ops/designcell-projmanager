# Debugging Guide for Assign/Modify Task and User Deletion Issues

## Issue 1: Assign/Modify Task Buttons Not Working

### How to Debug:

1. **Open your browser's Developer Tools** (F12 or Right-click → Inspect)
2. Go to the **Console** tab
3. Navigate to a project in the Project Structure view
4. Click on any "Assign Task" or "Modify Task" button
5. **Check the console** for:
   - Any error messages (red text)
   - Whether the button click is being detected at all
   - Whether `openSubstageAssign` function exists

### What to Look For:

**Test 1: Check if the button exists in DOM**
```javascript
// Run this in the browser console:
document.querySelectorAll('.sub-assign')
// Should show a list of buttons
```

**Test 2: Check if stagesBox exists**
```javascript
// Run this in the browser console:
document.querySelector('#stagesBox')
// Should show the stages container element
```

**Test 3: Check if the function is accessible**
```javascript
// Run this in the browser console:
typeof window.openSubstageAssign
// Should show "function" if it's accessible globally
```

**Test 4: Manually trigger the modal**
```javascript
// Run this in the browser console (replace with actual values):
window.openSubstageAssign('PRELIMINARY', 'Site Visit', '')
// This should open the assign modal if the function works
```

### Possible Root Causes:

1. **Event listener not attached**: The flag `_hasAssignListener` is preventing re-attachment
2. **Scope issue**: `openSubstageAssign` is defined inside `wireSubstageAssignUI` but not accessible
3. **Element reference issue**: `stagesBox` might be getting replaced after listener is attached
4. **Timing issue**: Listener attached before buttons are created

### The Fix Needed:

Replace lines 3812-3827 with:
```typescript
        // Always refresh the event listener
        if ((stagesBox as any)._assignClickHandler) {
          stagesBox.removeEventListener('click', (stagesBox as any)._assignClickHandler);
        }
        
        const clickHandler = async (ev: Event) => {
          const target = ev.target as HTMLElement;
          if (!target || !target.classList.contains('sub-assign')) return;
          
          ev.stopPropagation();
          const stageName = target.getAttribute('data-stage') || '';
          const subName = target.getAttribute('data-sub') || '';
          const taskId = target.getAttribute('data-task-id') || '';
          
          await openSubstageAssign(stageName, subName, taskId);
        };
        
        (stagesBox as any)._assignClickHandler = clickHandler;
        stagesBox.addEventListener('click', clickHandler);
```

---

## Issue 2: User Deletion Not Working

### How to Debug:

1. **Open browser Developer Tools** (F12)
2. Go to the **Console** tab
3. Navigate to User Management
4. Try to delete a user
5. **Watch the console** for messages starting with `[DELETE-USER]`

### What to Check in Console:

** Look for these messages:
- `[DELETE-USER] Starting deletion for: {userId} {userName}`
- `[DELETE-USER] Delete result: ...`
- Any error messages from Supabase

### Possible Root Causes:

1. **Row-Level Security (RLS) Policies**: Supabase might have RLS policies preventing deletion
2. **Foreign Key Constraints**: User has related data (tasks, projects, etc.)
3. **Permissions**: The logged-in user doesn't have permission to delete
4. **Silent failure**: Deletion succeeds but user list isn't refreshing properly

### How to Verify in Supabase:

1. Go to your **Supabase Dashboard**
2. Navigate to **Table Editor** → **users** table
3. Try to manually delete a user row
4. If it fails, check:
   - **Authentication** → **Policies** tab for RLS policies on `users` table
   - **Database** → Look for foreign key constraints

### The Fix Needed:

Add comprehensive logging and verification:

```typescript
async function deleteUser(userId: string, userName: string) {
  if (!isAdmin()) {
    toast('Only admins can delete users');
    return;
  }

  const confirmed = confirm(`Are you sure you want to delete user \"${userName}\" (${userId})?\\n\\nThis action cannot be undone.`);
  if (!confirmed) return;

  console.log('[DELETE-USER] Attempting to delete:', userId);

  try {
    // Delete with .select() to return the deleted row
    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('staff_id', userId)
      .select();

    console.log('[DELETE-USER] Result:', { data, error });

    if (error) {
      console.error('[DELETE-USER] Error:', error);
      const errorMsg = error.message || error.details || 'Failed to delete user';
      toast(`Delete failed: ${errorMsg}`);
      alert(`Could not delete user.\\n\\nError: ${errorMsg}\\n\\nPlease check:\\n1. Supabase RLS policies on 'users' table\\n2. Foreign key constraints\\n3. Your admin permissions`);
      return;
    }

    if (!data || data.length === 0) {
      console.warn('[DELETE-USER] No rows deleted');
      toast('Warning: Delete command succeeded but no rows affected');
      return;
    }

    console.log('[DELETE-USER] Successfully deleted:', data);
    toast('User deleted successfully');
    
    // Force reload
    await loadAllUsers();
  } catch (err) {
    console.error('[DELETE-USER] Exception:', err);
    toast(`Failed to delete user: ${err}`);
  }
}
```

---

## Quick Diagnostic Steps:

### For Assign/Modify Task Issue:
1. Open page
2. Open console (F12)
3. Run: `document.querySelectorAll('.sub-assign').length`
   - Should show number of buttons
4. Run: `typeof window.openSubstageAssign`
   - Should show "function"
5. Click a button
6. Check for errors in console

### For User Deletion Issue:
1. Open page
2. Open console (F12)
3. Go to User Management
4. Click Delete on a user
5. Look for `[DELETE-USER]` messages in console
6. Check what error (if any) is shown

---

## Alternative Solutions:

### If buttons still don't work:
Try adding an inline onclick back temporarily for testing:
```html
<button class="btn-sm sub-assign" 
        onclick="alert('Button clicked!'); return false;">
  Assign Task
</button>
```

If the alert shows, the button works but JavaScript isn't connecting.
If the alert doesn't show, the button itself is broken.

### If deletion keeps failing:
Check Supabase RLS policies with:
```sql
-- Run in Supabase SQL Editor
SELECT * FROM pg_policies WHERE tablename = 'users';
```

You might need to add a policy like:
```sql
CREATE POLICY "Admins can delete users" 
ON users 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.staff_id = auth.uid()::text 
    AND users.access_level = 'Admin'
  )
);
```
