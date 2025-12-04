# Deployment Guide - DesignCell Project Manager Notifications

## Pre-Deployment Checklist

### 1. Supabase Setup

```bash
# Verify tables exist
supabase db list

# Check migrations applied
supabase migration list
```

**Tables to verify:**
- ✅ users
- ✅ tasks
- ✅ task_status_log
- ✅ notifications
- ✅ projects

**Functions to verify:**
- ✅ get_next_dc_id()

### 2. Environment Variables

Create `.env.local` with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email Service
RESEND_API_KEY=your-resend-api-key

# Security
CRON_SECRET=generate-random-secret-here
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Change for prod
```

**Generate CRON_SECRET:**
```bash
openssl rand -base64 32
```

### 3. Local Testing

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Test in browser
open http://localhost:3000
```

**Test checklist:**
- [ ] Login works
- [ ] Can create a task
- [ ] Can assign task to user
- [ ] Notification bell appears with badge
- [ ] Can click notification dropdown
- [ ] Can mark notification as read
- [ ] Can mark all as read

### 4. Edge Functions Testing

Deploy Edge Functions locally:

```bash
# Start Supabase locally
supabase start

# Deploy Edge Functions
supabase functions deploy send-task-assignment-email
supabase functions deploy send-daily-digest
```

Test functions:

```bash
# Test send-task-assignment-email
curl -X POST http://localhost:54321/functions/v1/send-task-assignment-email \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "John Doe",
    "taskTitle": "Design Review",
    "projectName": "Main Project",
    "dueDate": "Jan 15, 2025",
    "taskId": "abc-123"
  }'

# Test send-daily-digest
curl -X POST http://localhost:54321/functions/v1/send-daily-digest \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 5. API Testing

```bash
# Get notifications
curl "http://localhost:3000/api/notifications?userId=DC01&limit=10"

# Mark as read
curl -X POST http://localhost:3000/api/notifications/notif-id/read \
  -H "Content-Type: application/json" \
  -d '{"userId":"DC01"}'

# Mark all as read
curl -X POST http://localhost:3000/api/notifications/mark-all-read \
  -H "Content-Type: application/json" \
  -d '{"userId":"DC01"}'

# Test cron endpoint
curl -X POST http://localhost:3000/api/cron/send-daily-digest \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Production Deployment

### Step 1: Build Application

```bash
npm run build
```

Verify no build errors before proceeding.

### Step 2: Deploy to Vercel

```bash
# Using Vercel CLI
vercel deploy

# Or push to Git (GitHub)
git add .
git commit -m "feat: add comprehensive notification system"
git push origin main
```

### Step 3: Set Environment Variables on Vercel

Go to Vercel Dashboard > Project Settings > Environment Variables

Add:
- `NEXT_PUBLIC_SUPABASE_URL` (can be public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (can be public)
- `SUPABASE_SERVICE_ROLE_KEY` (must be secret)
- `RESEND_API_KEY` (must be secret)
- `CRON_SECRET` (must be secret)
- `NEXT_PUBLIC_APP_URL` (should be your production URL)

### Step 4: Deploy Edge Functions to Production

```bash
# Authenticate with Supabase
supabase login

# Link to production project
supabase link

# Deploy functions
supabase functions deploy send-task-assignment-email --prod
supabase functions deploy send-daily-digest --prod

# Set secrets in production
supabase secrets set RESEND_API_KEY="your-key" --project-ref=YOUR_PROJECT_REF
```

### Step 5: Verify Deployment

```bash
# Test production APIs
curl "https://your-app.vercel.app/api/notifications?userId=DC01"

# Check function deployment
supabase functions list --project-ref=YOUR_PROJECT_REF
```

### Step 6: Configure Resend

1. Go to [Resend.com](https://resend.com)
2. Create account/login
3. Add your sending domain
4. Verify domain with DNS records
5. Add API key to Vercel environment variables

**DNS Records to add:**
- SPF record
- DKIM record
- DMARC record

(Resend provides exact values in dashboard)

## Post-Deployment Verification

### 1. Test Notification System

```bash
# Create test user
curl -X POST https://your-app.vercel.app/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com"}'

# Create test task with assignment
# (Use app UI)

# Check notifications received
curl "https://your-app.vercel.app/api/notifications?userId=TEST_USER"
```

### 2. Monitor Logs

**Vercel:**
- Go to Deployments > Select deployment > Logs
- Check for errors in API routes

**Supabase:**
- Go to Edge Functions > select function > Logs
- Check for errors in send-task-assignment-email, send-daily-digest

**Resend:**
- Go to [Resend Dashboard](https://resend.com)
- Check email delivery status

### 3. Test Cron Job

Monitor first daily digest run:

```bash
# Check Vercel cron logs (after 7 AM UTC)
vercel logs function-name
```

Or manually trigger:

```bash
curl -X POST https://your-app.vercel.app/api/cron/send-daily-digest \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 4. Test Email Sending

Assign a task to a user and:
1. Check user's email inbox
2. Verify email format/content
3. Check that links work in email

## Monitoring & Alerts

### Set Up Monitoring

**Vercel Monitoring:**
- Enable "Web Analytics" in Vercel dashboard
- Set up error alerts

**Supabase Monitoring:**
- Enable "Error tracking"
- Set up Slack alerts for Edge Function errors

**Resend Monitoring:**
- Monitor bounce rate
- Set up email delivery alerts

### Logs to Watch

**API Errors:**
```bash
# Check for 404, 500 errors
vercel logs api/notifications

# Check for timeout errors
vercel logs api/cron/send-daily-digest
```

**Email Errors:**
- Check Resend dashboard for bounced emails
- Monitor Supabase Edge Function error logs

**Database Errors:**
- Monitor Supabase database logs
- Check for constraint violations

## Troubleshooting Deployment Issues

### Issue: Cron job not running

**Solution:**
1. Verify `vercel.json` has correct cron configuration
2. Redeploy: `vercel deploy --prod`
3. Check Vercel function logs

### Issue: Notifications not appearing

**Solution:**
1. Verify Supabase connection string is correct
2. Check that notifications table exists
3. Test API endpoint manually
4. Check browser console for errors

### Issue: Emails not sending

**Solution:**
1. Verify `RESEND_API_KEY` is set
2. Check Resend dashboard for domain verification
3. Check Edge Function logs in Supabase
4. Test with Resend's test email

### Issue: High latency on notification API

**Solution:**
1. Check Supabase query performance
2. Verify database indexes are created
3. Consider adding Redis cache layer
4. Monitor connection pool usage

## Rollback Plan

If issues occur:

```bash
# Revert to previous deployment on Vercel
vercel rollback

# Or manually redeploy:
vercel deploy --prod
```

## Performance Optimization

After deployment, consider:

1. **Database Optimization**
   - Add more indexes as needed
   - Monitor slow queries
   - Archive old notifications (>90 days)

2. **Caching**
   - Add Redis for notification cache
   - Cache user permissions
   - Cache task lists

3. **Batch Operations**
   - Batch email sends
   - Batch notification creates
   - Batch updates

4. **API Optimization**
   - Implement request rate limiting
   - Add response caching headers
   - Compress API responses

## Security Considerations

### Production Security Checklist

- [ ] All API keys stored in Vercel secrets
- [ ] CRON_SECRET is strong (32+ characters)
- [ ] Database RLS policies are active
- [ ] Edge Functions have proper error handling
- [ ] No sensitive data logged
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints

### Regular Security Tasks

- [ ] Rotate API keys monthly
- [ ] Review access logs weekly
- [ ] Update dependencies
- [ ] Audit database permissions
- [ ] Monitor for suspicious activity

## Maintenance

### Daily Tasks

- Monitor error logs
- Check email delivery status
- Verify cron job ran

### Weekly Tasks

- Review performance metrics
- Check database size growth
- Audit access logs

### Monthly Tasks

- Review and rotate secrets
- Archive old notifications
- Update dependencies
- Performance optimization review

## Support & Documentation

For additional help:

1. Check `NOTIFICATION_SYSTEM_README.md` for detailed feature guide
2. Check `IMPLEMENTATION_SUMMARY.md` for technical details
3. Review test files in `__tests__/` for usage examples
4. Check inline code comments in source files

---

**Deployment Status:** Ready for Production ✅

**Next Steps:**
1. Follow pre-deployment checklist
2. Run local tests
3. Deploy to staging first
4. Deploy to production
5. Monitor logs for 24 hours
