# 🔧 Fix Vercel Deployment Errors

## Current Errors
1. ❌ `/api/notifications` - 500 Internal Server Error
2. ❌ `/api/users/generate-id` - 500 Internal Server Error

## Root Cause
Vercel is missing the `SUPABASE_SERVICE_ROLE_KEY` environment variable, which is required by both API routes.

---

## ✅ Solution: Add Environment Variable to Vercel

### Step 1: Go to Vercel Dashboard
1. Open https://vercel.com/dashboard
2. Select your project: **designcell-projmanager**
3. Go to **Settings** → **Environment Variables**

### Step 2: Add the Service Role Key
Add this environment variable:

**Name:**
```
SUPABASE_SERVICE_ROLE_KEY
```

**Value:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkdnljdmJnamNmcWNyY2ZwbGdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzIyMTYxNSwiZXhwIjoyMDc4Nzk3NjE1fQ.NLH5naoCnrG41ezoz1PT0JFWIMgwacSalAAFPvL_D3E
```

**Environment:** Select **Production**, **Preview**, and **Development**

### Step 3: Redeploy
After adding the environment variable:
1. Go to **Deployments** tab
2. Click the **...** menu on the latest deployment
3. Click **Redeploy**

OR just push a new commit and it will auto-deploy.

---

## Alternative: Quick Fix via CLI

If you have Vercel CLI installed:

```bash
cd /Users/babi/designcell-projmanager-1
vercel env add SUPABASE_SERVICE_ROLE_KEY
# Paste the value when prompted
# Select: Production, Preview, Development

# Then redeploy
vercel --prod
```

---

## Verification

After redeploying, these should work:
- ✅ User creation (generates DC## IDs)
- ✅ Notifications loading
- ✅ No 500 errors in console

---

## Why This Happened

The API routes `/api/notifications/route.js` and `/api/users/generate-id/route.js` both use:

```javascript
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
```

This variable exists in your local `.env.local` file, but Vercel deployments don't have access to local files. You must add it to Vercel's environment variables dashboard.

---

## Security Note

The Service Role Key bypasses Row-Level Security (RLS) policies, which is why it's needed for:
- **Notifications API**: To query notifications for any user
- **Generate ID API**: To call the `get_next_dc_id()` database function

Keep this key secure and never commit it to git (it's already in `.gitignore`).
