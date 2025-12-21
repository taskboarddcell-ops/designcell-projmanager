# Fix Assignee Names

## Issue
The application was saving assignee IDs (e.g., "DC23") instead of their names (e.g., "Asta Kumar Gasi Shrestha") in the `assignees` column of the `tasks` table. This occurred because the frontend was trying to read the user's name from a data attribute on the checkbox element, which was sometimes empty or missing, causing it to fall back to the value (ID).

## Fix Implemented
1.  **Database Data Fix**:
    *   Identified 12 tasks with incorrect `assignees` data (containing IDs starting with "DC").
    *   Executed SQL updates to replace these IDs with the correct names based on the `users` table.

2.  **Code Fix**:
    *   Modified `app/ProjectManagerClient.tsx` to change how assignee names are resolved during task assignment.
    *   Instead of relying on the DOM `data-name` attribute, the code now looks up the user's name directly from the `projectUsersCache` using the staff_id. This ensures that the correct name is always used, even if the DOM attribute is missing.
    *   Applied this fix to both "Bulk Assign" and "Single Task / Modify" workflows.

## Verification
*   The database now contains correct names for the affected tasks.
*   New task assignments will correctly save the assignee's name.
