# DesignCell Project Manager - Notification System Documentation

## 🎯 Overview

A complete notification system with in-app notifications, immediate task assignment emails, and daily task digests.

## 📊 Database Schema

### Tables Created

#### `notifications`
- **id** (UUID, PK) - Unique identifier
- **user_id** (TEXT, FK) - References `users.staff_id`
- **type** (TEXT, CHECK) - 'TASK_ASSIGNED', 'TASK_OVERDUE', 'DAILY_DIGEST'
- **title** (TEXT) - Notification title/subject
- **body** (TEXT, nullable) - Detailed message
- **link_url** (TEXT, nullable) - Route to task/project
- **is_read** (BOOLEAN) - Read status
- **created_at** (TIMESTAMP) - Creation time
- **read_at** (TIMESTAMP, nullable) - When marked as read

**Indexes:**
- `idx_notifications_user_created` - (user_id, created_at DESC)
- `idx_notifications_user_read` - (user_id, is_read)

#### `tasks` (Extended)
- All existing fields maintained
- Fields used: `id`, `project_id`, `project_name`, `task`, `status`, `due`, `assignee_ids`, `created_at`

#### `task_status_log` (Extended)
- All existing fields maintained for audit trail

## 🔌 API Endpoints

### Backend (Next.js API Routes)

#### 1. **GET `/api/notifications`**
```
Query params:
  - limit: number (default: 20)
  - unreadOnly: boolean (default: false)
  - offset: number (default: 0)

Returns: { notifications: Notification[], total: number, unread_count: number }
```

#### 2. **POST `/api/notifications/:id/read`**
```
Body: {}
Returns: { success: boolean, notification: Notification }
```

#### 3. **POST `/api/notifications/mark-all-read`**
```
Body: {}
Returns: { success: boolean, count: number }
```

#### 4. **POST `/api/tasks/handle-assignment-change`** (Internal)
```
Called automatically when task assigned/reassigned
- Creates notification
- Sends email
```

## 📧 Email Templates

### Task Assignment Email
- Subject: "New task assigned: {task_title}"
- Body: Project name, due date, task description, deep link

### Daily Digest Email
- Subject: "Your daily task summary — {count} items"
- Sections:
  - ⚠ Overdue tasks
  - ✅ Due today
  - 📅 Due in next 7 days

## ⏰ Scheduled Jobs

### Daily Digest Scheduler
- **Trigger:** Edge Function or serverless scheduler
- **Time:** 07:00 AM Asia/Kathmandu timezone daily
- **Logic:**
  - Query all active users
  - For each user: fetch incomplete tasks with due_date IS NOT NULL
  - Group by: overdue, due today, due next 7 days
  - Send email if any tasks exist
  - Create 'DAILY_DIGEST' notification entry

## 🎨 Frontend Components

### Header Notification Bell
- Location: Main topbar (next to user info)
- Features:
  - Badge showing unread count
  - Dropdown with latest notifications
  - Click to mark as read & navigate
  - Polling every 30 seconds (when dropdown visible)

## 🔐 Security

### RLS Policies (To Add)
- Users can only see their own notifications
- Users can only mark their own notifications as read
- Admins can view all notifications for audit

## 📋 Implementation Checklist

- [x] Create `notifications` table
- [x] Create `tasks` table (if missing)
- [x] Create `task_status_log` table (if missing)
- [ ] Add RLS policies
- [ ] Add API endpoints
- [ ] Add Edge Function for task assignment notifications
- [ ] Add Edge Function for daily digest scheduler
- [ ] Add notification bell UI component
- [ ] Add notification dropdown component
- [ ] Add tests

## 🚀 Deployment Notes

1. Apply all migrations first
2. Deploy RLS policies
3. Deploy Edge Functions
4. Update frontend with notification components
5. Test task assignment flow
6. Configure cron scheduler for daily digest
