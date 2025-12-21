# Task Assignment System - Comprehensive Audit Report

**Date:** 2025-12-21  
**Status:** Critical Issues Found  
**Priority:** High

---

## Executive Summary

The task assignment system has **three critical bugs** that have resulted in corrupted data in the production database:

1. **Bulk assign creates tasks with "(All Sub-stages)" instead of individual sub-tasks**: 89 problematic tasks (42.18% of all tasks)
2. **Multiple duplicate tasks created per single assignment action**: Race conditions in event handlers
3. **Bulk assign affecting multiple projects**: Improper project context management

---

## Database Impact Analysis

### Current State Statistics

| Metric | Value |
|--------|-------|
| Total Tasks | 211 |
| Problematic Tasks (with "(All Sub-stages)") | 89 |
| Percentage Corrupted | 42.18% |
| Affected Projects | 20+ |

### Most Affected Projects

| Project Name | Corrupted Task Count |
|--------------|---------------------|
| 2025-09 Binod Gyawali Residence, Chahabil | 37 |
| 2019-07 NIMB Bank | 11 |
| 2023-09 Lumbini Palace Resort- Annex | 6 |
| 2020-12 Barahi, Sedi | 5 |
| 2022-09 RR International Hospital | 4 |

### Evidence of Duplicate Creation

All 89 problematic tasks were created within a **~250ms window** (9:32:40.361 to 9:32:40.613 on 2025-12-21), indicating a single user action triggered massive duplicate insertions across multiple projects.

---

## Root Cause Analysis

### Bug #1: Bulk Assign Creates Wrong Task Title

**Location:** `ProjectManagerClient.tsx`, lines 1039-1056 (single task creation)

**The Problem:**
When bulk assign is triggered via `openStageBulkAssign()`, the code sets:
```javascript
assignState.sub = '(All Sub-stages)';  // Line 4410
```

Then in the single task creation logic (lines 1039-1067), instead of iterating through actual sub-stages, it creates a single task with:
```javascript
const title = `${stageName} - ${subName}`;  // subName = "(All Sub-stages)"
```

**Expected Behavior:** Bulk assign should iterate through each sub-stage in the stage plan and create individual tasks.

**Actual Behavior:** Creates a single task named "STRUCTURAL DRAWINGS - (All Sub-stages)" instead of separate tasks like:
- "STRUCTURAL DRAWINGS - Beam Detail"
- "STRUCTURAL DRAWINGS - Column Detail"
- "STRUCTURAL DRAWINGS - Foundation"
- etc.

### Bug #2: Multiple Event Handler Registrations

**Location:** `ProjectManagerClient.tsx`, lines 802-1122

**The Problem:**
There are **THREE separate `setTimeout()` blocks** registering handlers for the same `#stAssignBtn` button:

1. **Lines 802-862:** First handler registration (incomplete, returns early in try block)
2. **Lines 864-1081:** Second handler registration (100ms delay) - THIS IS THE ACTUAL HANDLER
3. **Lines 1083-1122:** Third handler registration (100ms delay) - Sets up event delegation

Each time `btn.onclick` is assigned, it overwrites the previous handler. However, the problem is:
- The event delegation on `stagesBox` (lines 1091-1121) adds a new `click` listener **every time** the component mounts
- `wireSubstageAssignUI()` is called multiple times from `renderProjectStructure()` (line 4928)
- Each call to `wireSubstageAssignUI()` exports new functions to `window`, but doesn't clean up old handlers

**Evidence from Code:**
```javascript
// Line 4444-4445: These are re-registered on EVERY render
(window as any).openSubstageAssign = openSubstageAssign;
(window as any).openStageBulkAssign = openStageBulkAssign;
```

### Bug #3: Cross-Project Assignment (Multiple Projects Affected)

**Location:** `ProjectManagerClient.tsx`, lines 4407-4442 (`openStageBulkAssign`)

**The Problem:**
The `openStageBulkAssign` function captures `proj` from the closure:
```javascript
function wireSubstageAssignUI(proj: any) {
  // ...
  const openStageBulkAssign = async (stageName: string) => {
    assignState.proj = proj;  // proj is from closure
    // ...
  };
}
```

But `renderProjectStructure()` is called for different contexts:
1. When viewing "All Projects" - `proj` is `null`
2. When switching between projects rapidly
3. When re-rendering after task updates

The race condition occurs when:
1. User is on Project A, clicks "Bulk Assign" for a stage
2. Before modal processes, user switches to Project B or the view re-renders
3. The `wireSubstageAssignUI()` is called again with the NEW project
4. `(window as any).openStageBulkAssign` now points to a function with Project B's context
5. Original button click executes with WRONG project context

**Evidence:** 13 different projects got tasks assigned in the same 250ms window, proving that a single bulk assign action propagated across multiple project contexts.

### Bug #4: Logic Error in Bulk Assign Handler

**Location:** `ProjectManagerClient.tsx`, lines 912-1001

**The Problem:**
The bulk assign logic (lines 912-1001) exists in the handler, but there's a critical flaw:

```javascript
if (state.isBulk && state.bulkStage) {
  // Correct bulk logic - iterates through subs
  for (const sub of subs) {
    // ... creates task for each sub
  }
}
```

However, when `state.isBulk` is true but the code somehow falls through to the **single task creation** logic (lines 1039-1067), it uses:
```javascript
const subName = subSel?.value || '';  // This is "(All Sub-stages)" from the disabled select
```

This happens when:
- The button is clicked multiple times in quick succession
- The `state.isBulk` flag is reset to `false` mid-processing (line 996)
- Race conditions between the three setTimeout handlers

---

## Code Architecture Issues

### Issue A: No Separation of Concerns

The file `ProjectManagerClient.tsx` is **5146 lines** long, mixing:
- HTML template strings
- Event handlers
- Business logic
- UI rendering
- Database operations
- State management

This monolithic structure makes it nearly impossible to:
- Debug issues
- Test individual components
- Prevent race conditions
- Maintain code quality

### Issue B: Global State via `window` Object

```javascript
(window as any).openSubstageAssign = openSubstageAssign;
(window as any).openStageBulkAssign = openStageBulkAssign;
```

Using the global `window` object to share functions between handlers is an anti-pattern that:
- Creates hidden dependencies
- Makes debugging extremely difficult
- Causes reference staleness issues
- Prevents proper garbage collection

### Issue C: Multiple Sources of Truth for Task State

The code maintains task data in:
1. `tasks` array (in-memory)
2. Supabase database
3. DOM elements (data attributes)
4. `assignState` global object

No synchronization mechanism exists between these, leading to stale reads and duplicate writes.

### Issue D: No Button Debouncing

The "Bulk Assign" and "Create Task" buttons lack proper debouncing:
```javascript
btn.onclick = async () => {
  if (btn.disabled) return;
  btn.disabled = true;
  // ... async operations
  btn.disabled = false;
};
```

This is vulnerable because:
- Multiple rapid clicks can queue before `btn.disabled = true` takes effect
- The `finally` block re-enables the button even on partial failures
- No guard against concurrent handler executions

---

## Detailed Refactoring Plan

### Phase 1: Immediate Bug Fixes (Priority: CRITICAL)

#### 1.1 Fix Bulk Assign Logic (Est: 2 hours)

**Problem:** `openStageBulkAssign` sets `sub = '(All Sub-stages)'` and the handler sometimes uses this value directly.

**Solution:**
1. Modify the bulk assign handler (lines 912-1001) to be the ONLY code path when `state.isBulk === true`
2. Add an early return after bulk processing to prevent fall-through
3. Remove the ability for `subName` to ever be `'(All Sub-stages)'`
4. Add validation: `if (subName === '(All Sub-stages)') return toast('Invalid sub-stage')`

**Code Change Required:**
```javascript
// In the #stAssignBtn handler, BEFORE line 1003:
// Ensure bulk logic is exhaustive
if (state.isBulk && state.bulkStage) {
  // ... existing bulk logic ...
  return;  // ADD THIS - prevent fall-through
}

// Add validation before single task creation:
if (subName === '(All Sub-stages)' || !subName) {
  toast('Please select a specific sub-stage');
  return;
}
```

#### 1.2 Consolidate Event Handlers (Est: 3 hours)

**Problem:** Three separate `setTimeout` blocks register handlers for the same elements.

**Solution:**
1. Remove the duplicate handler registrations (lines 802-862)
2. Consolidate into a single `initializeEventHandlers()` function
3. Use `addEventListener` with `{ once: true }` where appropriate
4. Add a global flag to prevent re-initialization: `let handlersInitialized = false`

**Code Change Required:**
```javascript
// Replace lines 802-1122 with:
let handlersInitialized = false;

function initializeEventHandlers() {
  if (handlersInitialized) return;
  handlersInitialized = true;
  
  const btn = container.querySelector('#stAssignBtn');
  if (btn) {
    btn.addEventListener('click', handleAssignClick);
  }
  
  // Single event delegation for stagesBox
  const stagesBox = container.querySelector('#stagesBox');
  if (stagesBox) {
    stagesBox.addEventListener('click', handleStagesBoxClick);
  }
}

// Call once at the end of useEffect
initializeEventHandlers();
```

#### 1.3 Fix Cross-Project Context Pollution (Est: 2 hours)

**Problem:** `wireSubstageAssignUI` re-exports functions to `window` on every render.

**Solution:**
1. Move `openSubstageAssign` and `openStageBulkAssign` outside of `wireSubstageAssignUI`
2. Make them read the current project from state at execution time, not closure time
3. Use `activeProjectName` to look up the project when the handler executes

**Code Change Required:**
```javascript
// Instead of:
const openStageBulkAssign = async (stageName: string) => {
  assignState.proj = proj;  // proj from closure - STALE!
  // ...
};

// Use:
const openStageBulkAssign = async (stageName: string) => {
  // Get current project at execution time
  const currentProj = projects.find(p => p.name === activeProjectName);
  if (!currentProj) {
    toast('Please select a project first');
    return;
  }
  assignState.proj = currentProj;  // Fresh reference
  // ...
};
```

#### 1.4 Add Comprehensive Debouncing (Est: 1 hour)

**Solution:**
```javascript
// At the top of the component
let isAssignmentInProgress = false;

async function handleAssignClick() {
  if (isAssignmentInProgress) {
    console.log('[DEBOUNCE] Assignment already in progress');
    return;
  }
  isAssignmentInProgress = true;
  
  try {
    // ... existing logic
  } finally {
    // Add delay before re-enabling
    setTimeout(() => {
      isAssignmentInProgress = false;
    }, 500);
  }
}
```

---

### Phase 2: Data Cleanup (Priority: HIGH)

#### 2.1 Remove Corrupted Tasks (Est: 30 mins)

```sql
-- First, backup problematic tasks
CREATE TABLE tasks_backup_20251221 AS
SELECT * FROM tasks WHERE sub_id = '(All Sub-stages)';

-- Then delete corrupted tasks
DELETE FROM tasks WHERE sub_id = '(All Sub-stages)';
```

#### 2.2 Verify No Orphaned References (Est: 30 mins)

```sql
-- Check for any references in notifications
SELECT * FROM notifications 
WHERE link_url LIKE '%' || (
  SELECT id FROM tasks WHERE sub_id = '(All Sub-stages)' LIMIT 1
)::text || '%';

-- Check task_events
SELECT * FROM task_events 
WHERE task_id IN (SELECT id FROM tasks WHERE sub_id = '(All Sub-stages)');
```

---

### Phase 3: Code Restructuring (Priority: MEDIUM)

#### 3.1 Extract Handler Functions

Create separate handler files:
- `handlers/assignmentHandlers.ts`
- `handlers/projectHandlers.ts`
- `handlers/taskHandlers.ts`

#### 3.2 Implement Proper State Management

Options:
1. React Context + useReducer
2. Zustand (lightweight)
3. Custom event bus

#### 3.3 Add Comprehensive Logging

```javascript
// Add structured logging for debugging
function logAssignment(action: string, data: any) {
  console.log(`[ASSIGNMENT] ${action}`, {
    timestamp: new Date().toISOString(),
    project: data.projectName,
    stage: data.stage,
    sub: data.sub,
    isBulk: data.isBulk,
    user: currentUser?.staff_id
  });
}
```

---

### Phase 4: Testing & Validation (Priority: MEDIUM)

#### 4.1 Unit Tests

```javascript
describe('Bulk Assignment', () => {
  it('should create individual tasks for each sub-stage', async () => {
    // ...
  });
  
  it('should not create tasks with "(All Sub-stages)" as sub_id', async () => {
    // ...
  });
  
  it('should only affect the selected project', async () => {
    // ...
  });
});
```

#### 4.2 Integration Tests

Test the full flow:
1. Select project
2. Click "Bulk Assign"
3. Select assignees
4. Submit
5. Verify database state

---

## Implementation Priority Matrix

| Task | Priority | Effort | Impact | Order |
|------|----------|--------|--------|-------|
| Fix bulk assign logic | CRITICAL | 2hrs | High | 1 |
| Consolidate event handlers | CRITICAL | 3hrs | High | 2 |
| Fix cross-project pollution | CRITICAL | 2hrs | High | 3 |
| Add debouncing | HIGH | 1hr | Medium | 4 |
| Data cleanup | HIGH | 1hr | Medium | 5 |
| Extract handler functions | MEDIUM | 4hrs | Low | 6 |
| Add state management | MEDIUM | 6hrs | Medium | 7 |
| Add logging | LOW | 2hrs | Low | 8 |
| Add tests | MEDIUM | 4hrs | Medium | 9 |

---

## Files Requiring Modification

| File | Changes Required |
|------|------------------|
| `app/ProjectManagerClient.tsx` | Major refactoring (lines 802-1122, 4340-4450, 4928) |
| Database | Data cleanup script |

---

## Rollback Plan

If issues occur after fixes:
1. Restore from `tasks_backup_20251221` table
2. Git revert to pre-fix commit
3. Re-deploy previous version

---

## Conclusion

The task assignment system has critical architectural flaws stemming from:
1. Monolithic code structure (5000+ lines in one file)
2. Improper use of global state (`window` object)
3. Multiple competing event handlers
4. No proper debouncing or race condition protection

**Recommended Action:** Implement Phase 1 fixes immediately to stop further data corruption, followed by data cleanup, then proceed with longer-term restructuring.

---

*Report prepared by automated audit system*  
*Verified against database state and code analysis*
