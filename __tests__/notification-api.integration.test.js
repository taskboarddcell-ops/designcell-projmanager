// __tests__/notification-api.integration.test.js
/**
 * Integration tests for Notification API endpoints
 * Run with: npm test -- notification-api.integration.test.js
 */

describe('Notification API Endpoints', () => {
  const baseUrl = 'http://localhost:3000/api';
  const testUserId = 'TEST_USER_001';

  describe('GET /api/notifications', () => {
    test('should return notifications for authenticated user', async () => {
      const response = await fetch(
        `${baseUrl}/notifications?userId=${testUserId}&limit=10`
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('notifications');
      expect(data).toHaveProperty('unread_count');
      expect(Array.isArray(data.notifications)).toBe(true);
    });

    test('should return 400 if userId is missing', async () => {
      const response = await fetch(`${baseUrl}/notifications`);
      expect(response.status).toBe(400);
    });

    test('should filter unread notifications when unreadOnly=true', async () => {
      const response = await fetch(
        `${baseUrl}/notifications?userId=${testUserId}&unreadOnly=true`
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      data.notifications.forEach(notif => {
        expect(notif.is_read).toBe(false);
      });
    });

    test('should support pagination with offset and limit', async () => {
      const response = await fetch(
        `${baseUrl}/notifications?userId=${testUserId}&limit=5&offset=0`
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.notifications.length).toBeLessThanOrEqual(5);
    });
  });

  describe('POST /api/notifications/:id/read', () => {
    let notificationId;

    beforeAll(async () => {
      // Create a test notification
      const response = await fetch(`${baseUrl}/notifications?userId=${testUserId}`);
      const data = await response.json();
      if (data.notifications.length > 0 && !data.notifications[0].is_read) {
        notificationId = data.notifications[0].id;
      }
    });

    test('should mark notification as read', async () => {
      if (!notificationId) return;

      const response = await fetch(
        `${baseUrl}/notifications/${notificationId}/read`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: testUserId }),
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.notification.is_read).toBe(true);
      expect(data.notification.read_at).toBeDefined();
    });

    test('should return 404 if notification not found', async () => {
      const response = await fetch(
        `${baseUrl}/notifications/invalid-id/read`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: testUserId }),
        }
      );

      expect(response.status).toBe(404);
    });

    test('should return 400 if userId or id missing', async () => {
      const response = await fetch(
        `${baseUrl}/notifications/${notificationId}/read`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/notifications/mark-all-read', () => {
    test('should mark all unread notifications as read', async () => {
      const response = await fetch(
        `${baseUrl}/notifications/mark-all-read`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: testUserId }),
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(typeof data.count).toBe('number');
    });

    test('should return 400 if userId missing', async () => {
      const response = await fetch(
        `${baseUrl}/notifications/mark-all-read`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );

      expect(response.status).toBe(400);
    });
  });
});
