
/**
 * Test Script for Task Handlers
 * Verified Phase 1 Fixes and Phase 3 Refactoring
 * Run with: npx tsx scripts/test-handlers.ts
 */

import { bulkAssignTasks, createTask } from '../app/handlers/taskHandlers';
import { isValidSubId } from '../app/handlers/types';

// --- MOCKS ---

const mockSupabase = {
    from: (table: string) => ({
        insert: (data: any) => ({
            select: () => ({
                single: async () => ({ data: { ...data, id: 'new-id' }, error: null }),
                then: (cb: any) => cb({ data: Array.isArray(data) ? data.map(d => ({ ...d, id: 'new-id' })) : [{ ...data, id: 'new-id' }], error: null })
            })
        }),
        update: (data: any) => ({
            eq: async (col: string, val: any) => ({ error: null })
        }),
        select: () => ({
            single: async () => ({ data: {}, error: null }),
            neq: () => ({
                order: async () => ({ data: [], error: null })
            })
        })
    })
} as any;

// Mock Data
const mockProject = {
    id: 'proj-1',
    name: 'Test Project',
    type: 'General',
    lead_ids: [],
    stage_plan: [
        {
            stage: 'STRUCTURAL',
            subs: ['Foundation', 'Columns', 'Beams', '(All Sub-stages)'] // Note: Includes invalid one
        }
    ]
};

const mockUser = {
    staff_id: 'user-1',
    name: 'Test User',
    access_level: 'Admin'
};

// --- TESTS ---

async function runTests() {
    console.log('--- STARTING TESTS ---\n');

    // TEST 1: isValidSubId
    console.log('TEST 1: isValidSubId validation');
    const valid = isValidSubId('Beam Detail');
    const invalid1 = isValidSubId('(All Sub-stages)');
    const invalid2 = isValidSubId('');

    if (valid && !invalid1 && !invalid2) {
        console.log('✅ PASS: validation logic correct');
    } else {
        console.error('❌ FAIL: validation logic incorrect', { valid, invalid1, invalid2 });
    }
    console.log('');

    // TEST 2: Bulk Assign Logic (The Core Bug Fix)
    console.log('TEST 2: Bulk Assign Handler');

    const result = await bulkAssignTasks(mockSupabase, {
        project: mockProject as any,
        stageName: 'STRUCTURAL',
        dueDate: '2025-01-01',
        priority: 'High',
        assigneeIds: ['u1', 'u2'],
        assigneeNames: ['User 1', 'User 2'],
        currentUser: mockUser as any,
        existingTasks: [] // No existing tasks
    });

    console.log(`Result: Created ${result.createdCount}, Skipped ${result.skippedCount}`);

    // We expect:
    // - 3 sub-stages total in plan: Foundation, Columns, Beams, (All Sub-stages)
    // - (All Sub-stages) should be SKIPPED
    // - 3 valid tasks should be created
    // Wait, I put 4 items in the mock plan: ['Foundation', 'Columns', 'Beams', '(All Sub-stages)']

    if (result.createdCount === 3 && result.skippedCount === 1) {
        console.log('✅ PASS: Correctly skipped "(All Sub-stages)" and created individual tasks');
    } else {
        console.error('❌ FAIL: Counts do not match expectations');
        console.log('Expected: Created 3, Skipped 1');
        console.log(`Actual: Created ${result.createdCount}, Skipped ${result.skippedCount}`);

        // Check the created tasks titles
        result.tasks.forEach(t => console.log(`   - Created Task: ${t.task} (Sub: ${t.sub_id})`));
    }
    console.log('');

    // TEST 3: Create Single Task Validation
    console.log('TEST 3: Single Task Creation Validation');

    const res1 = await createTask(mockSupabase, {
        projectId: 'p1',
        projectName: 'P1',
        stageId: 'S1',
        subId: '(All Sub-stages)', // <-- INVALID
        taskTitle: 'Test',
        dueDate: '2025-01-01',
        priority: 'High',
        assigneeIds: [],
        assigneeNames: [],
        createdById: 'u1',
        createdByName: 'U1'
    });

    if (!res1.success && res1.error === 'Invalid sub-stage specified') {
        console.log('✅ PASS: Correctly rejected "(All Sub-stages)"');
    } else {
        console.error('❌ FAIL: Did not reject invalid sub-stage', res1);
    }

    const res2 = await createTask(mockSupabase, {
        projectId: 'p1',
        projectName: 'P1',
        stageId: 'S1',
        subId: 'Valid Sub', // <-- VALID
        taskTitle: 'Test',
        dueDate: '2025-01-01',
        priority: 'High',
        assigneeIds: [],
        assigneeNames: [],
        createdById: 'u1',
        createdByName: 'U1'
    });

    if (res2.success) {
        console.log('✅ PASS: Correctly accepted valid sub-stage');
    } else {
        console.error('❌ FAIL: Rejected valid sub-stage', res2);
    }

    console.log('\n--- TESTS COMPLETED ---');
}

runTests().catch(console.error);
