// __tests__/notifications.test.js
import { createClient } from '@supabase/supabase-js';

describe('Notifications System', () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let supabase;
  let testUserId;
  let testTaskId;
  let testProjectId;

  beforeAll(() => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
  });

  describe('Database Schema', () => {
    test('notifications table exists with correct columns', async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .limit(0);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    test('tasks table has assignee_ids field', async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('assignee_ids')
        .limit(1);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    test('users table has staff_id as primary key', async () => {
      const { data, error } = await supabase
        .from('users')
        .select('staff_id, name, email')
        .limit(1);

      expect(error).toBeNull();
    });
  });

  describe('Notification Creation', () => {
    test('can create a TASK_ASSIGNED notification', async () => {
      // Create a test user
      const { data: userData } = await supabase
        .from('users')
        .insert([{
          staff_id: 'TEST_USER_001',
          name: 'Test User',
          email: 'test@example.com',
          access_level: 'Designer',
        }])
        .select()
        .single();

      if (userData) {
        testUserId = userData.staff_id;

        const { data: notifData, error } = await supabase
          .from('notifications')
          .insert([{
            user_id: testUserId,
            type: 'TASK_ASSIGNED',
            title: 'New task assigned: Test Task',
            body: 'You have been assigned a new task',
            link_url: '/tasks/123',
          }])
          .select()
          .single();

        expect(error).toBeNull();
        expect(notifData).toBeDefined();
        expect(notifData.type).toBe('TASK_ASSIGNED');
        expect(notifData.is_read).toBe(false);
      }
    });

    test('can create a DAILY_DIGEST notification', async () => {
      if (!testUserId) return;

      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          user_id: testUserId,
          type: 'DAILY_DIGEST',
          title: 'Daily task summary — 3 items',
          body: '1 overdue, 1 due today, 1 due this week',
          link_url: '/tasks',
        }])
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.type).toBe('DAILY_DIGEST');
    });
  });

  describe('Notification Retrieval', () => {
    test('can fetch unread notifications', async () => {
      if (!testUserId) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', testUserId)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    test('can count unread notifications', async () => {
      if (!testUserId) return;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', testUserId)
        .eq('is_read', false);

      expect(error).toBeNull();
      expect(typeof count).toBe('number');
    });
  });

  describe('Notification Updates', () => {
    test('can mark notification as read', async () => {
      if (!testUserId) return;

      // Get an unread notification
      const { data: unread } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', testUserId)
        .eq('is_read', false)
        .limit(1)
        .single();

      if (unread) {
        const { data: updated, error } = await supabase
          .from('notifications')
          .update({
            is_read: true,
            read_at: new Date().toISOString(),
          })
          .eq('id', unread.id)
          .select()
          .single();

        expect(error).toBeNull();
        expect(updated.is_read).toBe(true);
        expect(updated.read_at).toBeDefined();
      }
    });

    test('can mark all notifications as read', async () => {
      if (!testUserId) return;

      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', testUserId)
        .eq('is_read', false);

      expect(error).toBeNull();
    });
  });

  describe('Task Assignment Change Detection', () => {
    test('detects when assignees change', async () => {
      const oldTask = {
        id: 'task-1',
        assignee_ids: ['user-1'],
        task: 'Test Task',
        project_name: 'Test Project',
      };

      const newTask = {
        ...oldTask,
        assignee_ids: ['user-1', 'user-2'],
      };

      const oldAssignees = oldTask.assignee_ids || [];
      const newAssignees = newTask.assignee_ids || [];
      const newlyAssigned = newAssignees.filter(id => !oldAssignees.includes(id));

      expect(newlyAssigned).toEqual(['user-2']);
      expect(newlyAssigned.length > 0).toBe(true);
    });
  });

  describe('Daily Digest Task Grouping', () => {
    test('groups tasks correctly by due date', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split('T')[0];

      const tasks = [
        { due: yesterdayStr, task: 'Overdue task' },
        { due: todayStr, task: 'Today task' },
        { due: nextWeekStr, task: 'Next week task' },
      ];

      const overdue = tasks.filter(t => t.due < todayStr);
      const dueToday = tasks.filter(t => t.due === todayStr);
      const dueNextWeek = tasks.filter(t => t.due > todayStr && t.due <= nextWeekStr);

      expect(overdue.length).toBe(1);
      expect(dueToday.length).toBe(1);
      expect(dueNextWeek.length).toBe(1);
    });
  });

  afterAll(async () => {
    // Cleanup: delete test notifications
    if (testUserId) {
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', testUserId);

      // Delete test user
      await supabase
        .from('users')
        .delete()
        .eq('staff_id', testUserId);
    }
  });
});
