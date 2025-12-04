# DesignCell Project Manager

A comprehensive project management system for architecture firms with real-time task tracking, team collaboration, and intelligent notifications.

## Features

- ✅ **Task Management** - Create, assign, and track project tasks
- 📊 **Project Dashboard** - Kanban board, project structure, and task list views
- 👥 **Team Collaboration** - Assign tasks to team members with detailed permissions
- 🔔 **Smart Notifications** - In-app notifications, immediate task assignment emails, and daily digest summaries
- 📧 **Email Notifications** - Automatic emails when tasks are assigned and daily digests
- 🔐 **Role-Based Access** - Admin, Team Leader, and Designer roles with granular permissions
- 📱 **Responsive Design** - Works on desktop and mobile devices

## Tech Stack

- **Framework:** Next.js 16 + React 19
- **Database:** Supabase (PostgreSQL)
- **Email Service:** Resend
- **Backend:** Next.js API Routes + Supabase Edge Functions
- **Styling:** Custom CSS with responsive design

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Resend API key (for email notifications)

### Environment Setup

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Create a `.env.local` file with your configuration:

```bash
cp .env.example .env.local
```

3. Fill in your Supabase and Resend credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=your-resend-api-key
CRON_SECRET=your-random-secret-for-cron
```

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Notification System

### Overview

The notification system includes:

1. **In-App Notifications** - Real-time notification bell in the header
2. **Task Assignment Emails** - Immediate email when a task is assigned
3. **Daily Digest Emails** - Consolidated daily summary of tasks

### Database Schema

#### `notifications` Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | TEXT | References users.staff_id |
| type | TEXT | TASK_ASSIGNED, TASK_OVERDUE, DAILY_DIGEST |
| title | TEXT | Notification title |
| body | TEXT | Detailed message |
| link_url | TEXT | Link to related task/project |
| is_read | BOOLEAN | Read status |
| created_at | TIMESTAMP | Creation time |
| read_at | TIMESTAMP | When marked as read |

### API Endpoints

#### Get Notifications

```bash
GET /api/notifications?userId=USER_ID&limit=20&unreadOnly=false
```

Response:
```json
{
  "notifications": [...],
  "total": 42,
  "unread_count": 5
}
```

#### Mark as Read

```bash
POST /api/notifications/:id/read
Body: { "userId": "USER_ID" }
```

#### Mark All as Read

```bash
POST /api/notifications/mark-all-read
Body: { "userId": "USER_ID" }
```

### Scheduled Jobs

#### Daily Digest

- **Schedule:** 7:00 AM UTC (configurable)
- **Trigger:** Vercel Cron (see `vercel.json`)
- **Endpoint:** `POST /api/cron/send-daily-digest`
- **What it does:**
  - Fetches all active users
  - Groups incomplete tasks by due date
  - Sends email with: overdue tasks, tasks due today, tasks due within 7 days
  - Creates DAILY_DIGEST notification entry

### Edge Functions

#### send-task-assignment-email

Sends email when task is assigned. Invoked automatically from task creation/update flow.

**Location:** `supabase/functions/send-task-assignment-email/`

#### send-daily-digest

Sends consolidated daily task digest to all users.

**Location:** `supabase/functions/send-daily-digest/`

### Frontend Components

#### Notification Bell

Located in the header topbar, displays:
- Unread notification count badge
- Dropdown list of latest notifications
- Quick action to mark all as read
- Click notification to navigate to task

**Implementation:** `app/ProjectManagerClient.tsx` (search for "NOTIFICATION BELL HANDLING")

### Task Assignment Flow

When a task is created or assigned:

1. Frontend calls task create/update API
2. `handleTaskAssignmentChange()` function detects new assignees
3. Creates `TASK_ASSIGNED` notifications in database
4. Frontend can optionally call Edge Function to send email
5. User sees notification in bell icon immediately
6. Notification can be clicked to view task

### Testing

#### Run Unit Tests

```bash
npm test -- notifications.test.js
```

#### Run Integration Tests

```bash
npm test -- notification-api.integration.test.js
```

#### Manual Testing

1. Create a task and assign to a user
2. Check notification bell shows badge
3. Click notification to view details
4. Trigger daily digest: `curl -X POST http://localhost:3000/api/cron/send-daily-digest`

## Project Structure

```
app/
├── api/
│   ├── notifications/           # Notification API routes
│   ├── cron/                    # Scheduled job endpoints
│   └── ...
├── ProjectManagerClient.tsx     # Main app component
└── globals.css                  # Global styles + notification styles

lib/
├── supabaseClient.js            # Supabase client
├── notificationHelpers.js       # Notification utility functions
└── ...

supabase/
├── functions/
│   ├── send-task-assignment-email/
│   └── send-daily-digest/
└── config.toml

__tests__/
├── notifications.test.js        # Unit tests
└── notification-api.integration.test.js  # Integration tests
```

## Deployment

### Deploy to Vercel

```bash
vercel deploy
```

### Environment Variables

Make sure to set all required environment variables in Vercel project settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `CRON_SECRET`

### Cron Configuration

Cron job is configured in `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/send-daily-digest",
    "schedule": "0 7 * * *"
  }]
}
```

To change the schedule, update the cron expression (crontab format).

## Database Migrations

All required tables are created via Supabase migrations:

- `users` - Project manager users
- `tasks` - Project tasks
- `task_status_log` - Task audit trail
- `notifications` - User notifications

Migrations are idempotent and can be re-run safely.

## Troubleshooting

### Notifications not appearing

1. Check browser console for errors
2. Verify user is logged in: `currentUser` should be set
3. Check Network tab - API calls to `/api/notifications` should return 200
4. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set

### Emails not sending

1. Verify `RESEND_API_KEY` is set in environment
2. Check Resend dashboard for delivery status
3. Check function logs in Supabase dashboard
4. Make sure email domain is verified in Resend

### Cron job not running

1. Check Vercel deployment logs
2. Verify `CRON_SECRET` is set if auth is enabled
3. Test manually: `curl -X POST http://localhost:3000/api/cron/send-daily-digest`

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Resend Email API](https://resend.com/docs)

## Support

For issues or questions, please contact the development team or open an issue in the repository.

## License

Proprietary - DesignCell
