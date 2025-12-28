import { computeMetrics } from '../analytics';

// Mock Data
const mockTasks = [
    {
        id: '1',
        task: 'Task 1',
        created_at: '2023-01-01T10:00:00Z',
        completed_at: '2023-01-05T10:00:00Z', // 4 days based on raw diff
        status: 'Complete',
        project_name: 'Project A',
        assignees: ['Alice']
    },
    {
        id: '2',
        task: 'Task 2',
        created_at: '2023-01-02T10:00:00Z',
        completed_at: null,
        status: 'In Progress',
        due: '2023-01-01T10:00:00Z', // Overdue relative to now
        project_name: 'Project A',
        assignees: ['Bob']
    }
];

const mockLogs = [
    {
        task_id: '1',
        to_status: 'In Progress',
        changed_at: '2023-01-02T10:00:00Z' // Real start
    },
    {
        task_id: '1',
        to_status: 'Complete',
        changed_at: '2023-01-05T10:00:00Z' // Real end
    }
];

// Test
describe('Reporting Analytics', () => {

    it('calculates cycle time correctly from logs', () => {
        const metrics = computeMetrics(mockTasks, mockLogs, [], '2023-01-01', '2023-01-10');
        // Task 1: Start Jan 2, End Jan 5 = 3 days cycle time
        // Note: Our naive implementation might need adjustment if using partial days, 
        // but currently it does Math.floor of diff.
        // Jan 5 - Jan 2 = 3 days.
        expect(metrics.avgCycleTimeDays).toBe(3);
    });

    it('counts overdue tasks correctly', () => {
        const metrics = computeMetrics(mockTasks, mockLogs, [], '2023-01-01', '2023-01-10');
        // Task 2 is overdue (Due Jan 1, open)
        // Note: computeMetrics compares against "new Date()" (now). 
        // If "now" is > Jan 1 2023 (which it is), this should be 1.
        expect(metrics.overdueCount).toBe(1);
    });

    it('aggregates status counts', () => {
        const metrics = computeMetrics(mockTasks, mockLogs, [], '2023-01-01', '2023-01-10');
        expect(metrics.byStatus['Complete']).toBe(1);
        expect(metrics.byStatus['In Progress']).toBe(1);
    });
});
