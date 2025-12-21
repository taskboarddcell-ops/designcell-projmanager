# 🔍 Debugging User Deactivation & Notifications

## What I Added:

### 1. **Deactivation Debugging** (Lines 1644-1666)
Added detailed console logging to see exactly what happens when deactivating a user:

```typescript
console.log('[DEACTIVATE-USER] About to update user status:', { userId, currentStatus: 'checking...' });

const { data: updateResult, error: deactivateError } = await supabase
  .from('users')
  .update({ status: 'deactivated' })
  .eq('staff_id', userId)
  .select(); // ← Returns the updated row

console.log('[DEACTIVATE-USER] Update result:', { updateResult, deactivateError });
```

**What to check:**
- If `updateResult` is empty → RLS policy is blocking the UPDATE
- If `deactivateError` exists → Database error (check message)

### 2. **Notification Debugging** (Lines 898, 936-946)
Added logging to track notification creation:

```typescript
console.log('[NOTIFICATION] handleTaskStatusChange called:', { taskName, fromStatus, toStatus, changedByName });
// ...
console.log('[NOTIFICATION] Creating notifications for users:', notifyUsers);
console.log('[NOTIFICATION] Notification data:', notifications);

const { data: insertResult, error: insertError } = await supabase
  .from('notifications')
  .insert(notifications)
  .select();

if (insertError) {
  console.error('[NOTIFICATION] Insert failed:', insertError);
} else {
  console.log('[NOTIFICATION] Successfully created', notifications.length, 'notifications');
}
```

---

##  Testing Steps:

### ✅ Test 1: User Deactivation

1. Open browser console (F12 → Console tab)
2. Go to User Management
3. Click "Deactivate" on a user
4. **Watch console for:**
   ```
   [DEACTIVATE-USER] About to update user status: { userId: "DC02", ... }
   [DEACTIVATE-USER] Update result: { updateResult: [...], deactivateError: null }
   ```

**Expected Results:**
- ✅ `updateResult` should have 1 entry
- ✅ `updateResult[0].status` should be `'deactivated'`
- ❌ If `updateResult` is empty → **RLS POLICY BLOCKING UPDATE**

**If RLS is blocking:**
Go to Supabase Dashboard → Database → users table → Policies
You need a policy like:
```sql
CREATE POLICY "Allow admin to update users"
ON users FOR UPDATE
USING (true)
WITH CHECK (true);
```

---

### ✅ Test 2: Notifications

1. Open browser console (F12 → Console tab)
2. Assign a task to a user
3. Change task status (Pending → In Progress)
4. **Watch console for:**
   ```
   [NOTIFICATION] handleTaskStatusChange called: { taskName: "...", fromStatus: "Pending", toStatus: "In Progress", ... }
   [NOTIFICATION] Creating notifications for users: ["DC01", "DC02"]
   [NOTIFICATION] Notification data: [{ user_id: "DC01", type: "TASK_STATUS_UPDATE", ... }]
   [NOTIFICATION] Successfully created 2 notifications
   ```

**Expected Results:**
- ✅ Function should be called when task status changes
- ✅ Should identify admin users and project leads
- ✅ Should create notifications
- ❌ If "Insert failed" → **RLS POLICY BLOCKING INSERT**

**If RLS is blocking:**
Go to Supabase Dashboard → Database → notifications table → Policies
You might need:
```sql
CREATE POLICY "Allow creating notifications"
ON notifications FOR INSERT
WITH CHECK (true);
```

---

## 🎯 What You Should See:

### When Deactivating User:
```
Console Output:
┌──────────────────────────────────────────────────────┐
│ [DEACTIVATE-USER] About to update user status:      │
│   { userId: "DC02", currentStatus: "checking..." }  │
│ [DEACTIVATE-USER] Update result:                    │
│   { updateResult: [{ staff_id: "DC02", status:      │
│     "deactivated", ... }], deactivateError: null }   │
│ [DEACTIVATE-USER] Successfully deactivated user: DC02│
└──────────────────────────────────────────────────────┘

Supabase Table:
users → DC02 → status = "deactivated" ✓
```

### When Changing Task Status:
```
Console Output:
┌──────────────────────────────────────────────────────┐
│ [NOTIFICATION] handleTaskStatusChange called:        │
│   { taskName: "Design Review", fromStatus:           │
│     "Pending", toStatus: "In Progress", ... }        │
│ [NOTIFICATION] Creating notifications for users:     │
│   ["DC01"]                                           │
│ [NOTIFICATION] Successfully created 1 notifications  │
└──────────────────────────────────────────────────────┘

Supabase Table:
notifications → New row with type: "TASK_STATUS_UPDATE" ✓
```

---

## 🚨 Common Issues:

### Issue 1: "No rows updated - RLS policy may be blocking"
**Cause:** Supabase Row-Level Security policy preventing UPDATE on users table

**Fix:**
1. Go to Supabase Dashboard
2. Database → users table → Policies
3. Add UPDATE policy for admins

### Issue 2: "[NOTIFICATION] Insert failed"
**Cause:** RLS policy blocking INSERT on notifications table

**Fix:**
1. Go to Supabase Dashboard
2. Database → notifications table → Policies  
3. Add INSERT policy

### Issue 3: Function not called at all
**Check:**
- Is `handleTaskStatusChange()` being called? (Search console for "[NOTIFICATION]")
- Are you changing task status via drag-and-drop or status dropdown?
- Is the task part of a project with leads?

---

## 📊 Next Steps Based on Console Output:

1. **Run the tests above**
2. **Check your console output**
3. **Share the console logs** if you see errors
4. **Check Supabase Dashboard** → Database → users table (check if status column updated)
5. **Check Supabase Dashboard** → Database → notifications table (check if rows created)

The detailed logging will tell us exactly where things are failing!
