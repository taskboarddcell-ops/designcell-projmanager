# Soft-Delete (Deactivate) Users - Implementation Guide

## ✅ Phase 1: Database Schema (COMPLETED)

### Changes Applied:
1. **Added `status` column to `users` table**
   - Type: `text`
   - Default: `'active'`
   - Constraint: CHECK (status IN ('active', 'deactivated'))

2. **Created `task_events` table**
   ```sql
   CREATE TABLE task_events (
     id uuid PRIMARY KEY,
     task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
     event_type text NOT NULL,
     from_user_id text,
     to_user_id text,
     performed_by text,
     created_at timestamptz DEFAULT now()
   );
   ```

---

## 🔄 Phase 2: Application Logic Updates

### Step 1: Replace deleteUser with deactivateUser

**Location:** `app/ProjectManagerClient.tsx` (around line 1465)

**Action:** Replace the entire `deleteUser` function with the code in `DEACTIVATE_USER_FUNCTION.ts`

**Key Features:**
- ✅ Shows task count before deactivation
- ✅ Offers 3 options: Leave assigned, Reassign, Unassign
- ✅ Logs all actions to `task_events` table
- ✅ Preserves historical data
- ✅ Prevents hard deletion

### Step 2: Update Button Event Listener

**Location:** `app/ProjectManagerClient.tsx` (around line 1443)

**Find:**
```typescript
userManagementList.querySelectorAll<HTMLElement>('.user-delete').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const userId = btn.getAttribute('data-user-id');
    const userName = btn.getAttribute('data-user-name');
    if (userId && userName) {
      await deleteUser(userId, userName);  // ← CHANGE THIS
    }
  });
});
```

**Replace with:**
```typescript
userManagementList.querySelectorAll<HTMLElement>('.user-delete').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const userId = btn.getAttribute('data-user-id');
    const userName = btn.getAttribute('data-user-name');
    if (userId && userName) {
      await deactivateUser(userId, userName);  // ← NEW
    }
  });
});
```

### Step 3: Update Button Label

**Location:** `app/ProjectManagerClient.tsx` (around line 1419)

**Find:**
```typescript
<button 
  class="btn-sm btn-danger user-delete" 
  data-user-id="${esc(user.staff_id)}"
  data-user-name="${esc(user.name || user.staff_id)}"
  style="margin-left:4px;"
>
  Delete  // ← CHANGE THIS
</button>
```

**Replace with:**
```typescript
<button 
  class="btn-sm btn-danger user-delete" 
  data-user-id="${esc(user.staff_id)}"
  data-user-name="${esc(user.name || user.staff_id)}"
  style="margin-left:4px;"
>
  Deactivate  // ← NEW
</button>
```

---

## 🔒 Phase 3: Login Prevention for Deactivated Users

**Location:** `app/ProjectManagerClient.tsx` (around line 2436)

**Find:**
```typescript
const user = usersData && usersData[0];
if (!user) {
  toast('Invalid credentials');
  return;
}

currentUser = user;  // ← ADD CHECK HERE
```

**Replace with:**
```typescript
const user = usersData && usersData[0];
if (!user) {
  toast('Invalid credentials');
  return;
}

// Prevent deactivated users from logging in
if (user.status === 'deactivated') {
  toast('This account has been deactivated. Please contact an administrator.');
  return;
}

currentUser = user;
```

---

## 🎨 Phase 4: UI Updates

### Step 1: Filter Deactivated Users from Assignment Dropdowns

**Location:** Multiple places where users are loaded for assignment

**Find patterns like:**
```typescript
const { data: users, error } = await supabase
  .from('users')
  .select('*')
  .order('name', { ascending: true });
```

**Replace with:**
```typescript
const { data: users, error } = await supabase
  .from('users')
  .select('*')
  .eq('status', 'active')  // ← ADD THIS
  .order('name', { ascending: true });
```

**Locations to update:**
1. Line ~2808: `btnNewProject` click handler (project leads)
2. Line ~3741: `loadProjectUsers` function
3. Line ~1369: `loadAllUsers` function (keep this one showing all users)

### Step 2: Show Deactivated Status in Task Lists

**Location:** `app/ProjectManagerClient.tsx` - Task rendering functions

**Add helper function:**
```typescript
async function getUserDisplayName(staffId: string): Promise<string> {
  const { data: user } = await supabase
    .from('users')
    .select('name, status')
    .eq('staff_id', staffId)
    .single();
  
  if (!user) return staffId;
  
  const name = user.name || staffId;
  return user.status === 'deactivated' ? `${name} (deactivated)` : name;
}
```

### Step 3: Add Visual Indicator for Deactivated Users in User Management

**Location:** `app/ProjectManagerClient.tsx` (around line 1400)

**Find:**
```typescript
userManagementList.innerHTML = users.map((user) => {
  const isCurrentUser = currentUser && currentUser.staff_id === user.staff_id;

  return `
    <tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:12px 10px;">${esc(user.name || 'N/A')}</td>
```

**Replace with:**
```typescript
userManagementList.innerHTML = users.map((user) => {
  const isCurrentUser = currentUser && currentUser.staff_id === user.staff_id;
  const isDeactivated = user.status === 'deactivated';
  const rowStyle = isDeactivated ? 'border-bottom:1px solid #e5e7eb;background:#f3f4f6;opacity:0.7;' : 'border-bottom:1px solid #e5e7eb;';

  return `
    <tr style="${rowStyle}">
      <td style="padding:12px 10px;">
        ${esc(user.name || 'N/A')}
        ${isDeactivated ? '<span class="badge" style="background:#fee2e2;color:#991b1b;margin-left:8px;">Deactivated</span>' : ''}
      </td>
```

---

## 📊 Phase 5: Add "Orphaned Tasks" Filter (Optional Enhancement)

**Location:** Add new filter option in task list view

```typescript
// Add to filter options
<select id="filterOrphaned" class="select">
  <option value="all">All Tasks</option>
  <option value="orphaned">Assigned to Deactivated Users</option>
  <option value="active">Assigned to Active Users</option>
</select>

// Add filter logic
const orphanedFilter = (el('filterOrphaned') as HTMLSelectElement)?.value || 'all';

if (orphanedFilter === 'orphaned') {
  // Check if any assignee is deactivated
  const { data: deactivatedUsers } = await supabase
    .from('users')
    .select('staff_id')
    .eq('status', 'deactivated');
  
  const deactivatedIds = deactivatedUsers?.map(u => u.staff_id) || [];
  filtered = filtered.filter(task => 
    task.assignee_ids?.some(id => deactivatedIds.includes(id))
  );
} else if (orphanedFilter === 'active') {
  // Only show tasks assigned to active users
  const { data: activeUsers } = await supabase
    .from('users')
    .select('staff_id')
    .eq('status', 'active');
  
  const activeIds = activeUsers?.map(u => u.staff_id) || [];
  filtered = filtered.filter(task => 
    task.assignee_ids?.every(id => activeIds.includes(id))
  );
}
```

---

## 🧪 Testing Checklist

- [ ] Deactivate a user with no tasks
- [ ] Deactivate a user with open tasks (leave assigned)
- [ ] Deactivate a user with open tasks (reassign to another user)
- [ ] Deactivate a user with open tasks (unassign)
- [ ] Verify deactivated user cannot log in
- [ ] Verify deactivated users don't appear in assignment dropdowns
- [ ] Verify task history shows deactivated users correctly
- [ ] Verify `task_events` table logs all reassignments
- [ ] Verify completed tasks keep original assignee
- [ ] Check User Management list shows deactivated status

---

## 🔄 Future Enhancements

1. **Reactivate User Feature**
   ```typescript
   async function reactivateUser(userId: string) {
     await supabase
       .from('users')
       .update({ status: 'active' })
       .eq('staff_id', userId);
   }
   ```

2. **Bulk Reassignment Tool**
   - Admin can reassign all tasks from one user to another

3. **Deactivation History**
   - Track when users were deactivated and by whom

4. **Auto-deactivation**
   - Deactivate users after X days of inactivity

---

## 📝 Summary

This implementation provides:
✅ Soft-delete (deactivation) instead of hard-delete
✅ Task reassignment options with audit logging
✅ Login prevention for deactivated users
✅ Historical data preservation
✅ Clear UI indicators for deactivated users
✅ Compliance-ready audit trail

**Status:** Database schema complete. Application logic ready for implementation.
