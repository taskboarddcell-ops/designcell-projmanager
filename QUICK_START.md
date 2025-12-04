# Quick Start Guide - Notification System

## 5-Minute Setup

### 1. Install Dependencies
```bash
cd /Users/babi/designcell-projmanager
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-key
RESEND_API_KEY=your-key
CRON_SECRET=your-random-secret
```

### 3. Run Development Server
```bash
npm run dev
```

Open http://localhost:3000

### 4. Test Notifications
1. Login with existing credentials
2. Create a new task
3. Assign to a user
4. Check notification bell - should show badge with "1"
5. Click bell to see notification
6. Click notification to mark as read

---

## Common Tasks

### Test Notification API
```bash
# Get notifications
curl "http://localhost:3000/api/notifications?userId=DC01&limit=10"

# Mark as read
curl -X POST http://localhost:3000/api/notifications/notification-id/read \
  -H "Content-Type: application/json" \
  -d '{"userId":"DC01"}'

# Mark all as read
curl -X POST http://localhost:3000/api/notifications/mark-all-read \
  -H "Content-Type: application/json" \
  -d '{"userId":"DC01"}'
```

### Test Daily Digest
```bash
# Trigger manually
curl -X POST http://localhost:3000/api/cron/send-daily-digest \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Run Tests
```bash
# Unit tests
npm test -- notifications.test.js

# Integration tests
npm test -- notification-api.integration.test.js
```

---

## Key Files

| File | Purpose |
|------|---------|
| `app/ProjectManagerClient.tsx` | Main app + notification bell logic |
| `app/api/notifications/route.js` | GET notifications endpoint |
| `app/api/notifications/[id]/read/route.js` | Mark single as read |
| `lib/notificationHelpers.js` | Helper functions |
| `supabase/functions/send-task-assignment-email/` | Email on assignment |
| `supabase/functions/send-daily-digest/` | Daily digest email |
| `app/globals.css` | Notification styles |

---

## Important Code Locations

### Notification Bell Component
**File:** `app/ProjectManagerClient.tsx` (search for "NOTIFICATION BELL HANDLING")

Logic:
- Load notifications on bell click
- Poll every 30s when dropdown open
- Handle click to mark as read

### Task Assignment Handling
**Function:** `handleTaskAssignmentChange()` in `ProjectManagerClient.tsx` (line ~715)

Purpose:
- Detect new assignees when task is created/updated
- Create notification records
- Send optional email

### API Endpoints
**Location:** `app/api/notifications/`

Endpoints:
- `route.js` - GET /api/notifications
- `[id]/read/route.js` - POST mark as read
- `mark-all-read/route.js` - POST mark all as read

---

## Debug Tips

### Check if Notifications are Created
```bash
# Query database
supabase --project-ref YOUR_PROJECT list

# Or via Supabase dashboard
# Navigate to tables > notifications
```

### Check API Logs
```bash
# Terminal
npm run dev

# Browser console
F12 → Console tab

# Network tab
F12 → Network → filter "/api/notifications"
```

### Check Edge Function Logs
```bash
# Supabase dashboard
Functions > select function > Logs
```

### Check Email Status
```bash
# Resend dashboard
Logs tab → search your domain
```

---

## Common Issues

### Notification Bell Not Showing
- Check console for errors (F12)
- Verify currentUser is set (logged in)
- Verify API endpoint returns data

### Notifications Not Appearing
- Check if user has permission to read notifications
- Verify user_id is correct
- Check Supabase RLS policies

### Emails Not Sending
- Verify RESEND_API_KEY is set
- Check Resend domain is verified
- Check Edge Function logs for errors

### Cron Job Not Running
- Check Vercel deployment logs
- Verify vercel.json has correct cron config
- Test manually with curl

---

## Next Steps

1. **Local Development**
   - Make code changes
   - Test in browser
   - Run tests

2. **Deploy to Vercel**
   ```bash
   vercel deploy --prod
   ```

3. **Deploy Edge Functions**
   ```bash
   supabase functions deploy send-task-assignment-email --prod
   supabase functions deploy send-daily-digest --prod
   ```

4. **Monitor Production**
   - Check Vercel logs
   - Check Supabase logs
   - Check Resend dashboard

---

## Useful Commands

```bash
# Run dev server
npm run dev

# Build
npm run build

# Lint
npm run lint

# Test
npm test

# Deploy to Vercel
vercel deploy --prod

# Deploy to Supabase
supabase functions deploy send-task-assignment-email --prod

# Generate CRON_SECRET
openssl rand -base64 32

# Check Supabase status
supabase status

# View Edge Function logs
supabase functions list
```

---

## Documentation Links

| Doc | Purpose |
|-----|---------|
| `NOTIFICATION_SYSTEM_DOCS.md` | Technical reference |
| `NOTIFICATION_SYSTEM_README.md` | Feature guide |
| `IMPLEMENTATION_SUMMARY.md` | Implementation details |
| `DEPLOYMENT_GUIDE.md` | Production deployment |
| `NOTIFICATION_COMPLETION_REPORT.md` | Summary & status |

---

## Quick Reference

### API Response Format
```json
{
  "notifications": [
    {
      "id": "uuid",
      "user_id": "DC01",
      "type": "TASK_ASSIGNED",
      "title": "New task assigned: Design Review",
      "body": "You have been assigned...",
      "link_url": "/tasks/abc-123",
      "is_read": false,
      "created_at": "2025-01-15T10:30:00Z",
      "read_at": null
    }
  ],
  "total": 42,
  "unread_count": 5
}
```

### Notification Types
- `TASK_ASSIGNED` - Task newly assigned to user
- `TASK_OVERDUE` - Task became overdue
- `DAILY_DIGEST` - Daily summary

### Cron Schedule Format
```
Minute Hour Day Month DayOfWeek
0      7    *   *     *          → Every day at 7 AM
30     6    *   *     1          → Every Monday at 6:30 AM
0      */6  *   *     *          → Every 6 hours
*/15   *    *   *     *          → Every 15 minutes
```

---

## Support

- Check documentation files
- Review test files for examples
- Check inline code comments
- Review browser console for errors
- Review Vercel/Supabase logs

---

**Happy coding! 🚀**
