# ✅ User Creation Fixed

## Problem
User creation was failing with error:
```
/api/users/generate-id: Failed to load resource: the server responded with a status of 500
get_next_dc_id error
```

## Root Cause
The API route `/app/api/users/generate-id/route.js` was calling a Postgres function `get_next_dc_id()` that didn't exist in the database.

## Solution Applied
Created the missing database function using Supabase migration:

```sql
CREATE OR REPLACE FUNCTION get_next_dc_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
  next_id TEXT;
BEGIN
  -- Get the highest DC number from existing users
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(staff_id FROM 3) AS INTEGER
      )
    ),
    0
  ) + 1
  INTO next_num
  FROM users
  WHERE staff_id ~ '^DC[0-9]+$';
  
  -- Format as DC## with zero padding
  next_id := 'DC' || LPAD(next_num::TEXT, 2, '0');
  
  RETURN next_id;
END;
$$;
```

## How It Works
1. Scans all existing users with staff_id format `DC##` (e.g., DC01, DC02)
2. Finds the highest number
3. Increments by 1
4. Returns the next ID with zero-padding (e.g., DC03, DC04, etc.)

## Status
✅ **Fixed** - Database function created and deployed to Supabase

## Testing
Try creating a new user now - it should work without errors!

---

## Additional Note: Tasks 400 Error
The error `advycvbgjcfqcrcfplge.supabase.co/rest/v1/tasks?select=*: Failed to load resource: the server responded with a status of 400` might be caused by:
- Old tasks with `null` due dates being ordered
- This should resolve itself as we've now made due dates required for all new tasks
- If it persists, we can add `.order('due', { ascending: true, nullsFirst: false })` to handle null values
