# 🔴 URGENT: 401 Unauthorized Fix Guide

## Problem
Frontend production build still using `localhost` URLs, causing 401 Unauthorized errors.

## Root Cause
The production frontend was built with old `.env` file that had:
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1  ❌
```

## Solution Steps

### 1. Verify .env File (CRITICAL!)

**File:** `client/.env`

Should contain:
```env
VITE_API_BASE_URL=https://accountzclub.com/api/v1
VITE_FRONTEND_URL=https://accountzclub.com/
```

### 2. Rebuild Frontend

#### On Windows (Local):
```powershell
cd client
npm run build
```

#### On Linux Server:
```bash
cd /root/crypto-nexus/client
npm run build
```

### 3. Deploy New Build

#### Option A: Copy dist folder
```bash
# On server
cd /root/crypto-nexus/client
rm -rf /var/www/accountzclub.com/html/*
cp -r dist/* /var/www/accountzclub.com/html/
```

#### Option B: If using Docker
```bash
# Rebuild Docker image
docker-compose build frontend
docker-compose up -d frontend
```

### 4. Clear Cache & Test

```bash
# Clear Nginx cache (if applicable)
sudo systemctl reload nginx

# Clear Cloudflare cache (if using Cloudflare)
# Go to Cloudflare Dashboard > Caching > Purge Everything
```

### 5. Verify in Browser

1. Open browser DevTools (F12)
2. Go to Network tab
3. Clear browser cache (Ctrl+Shift+Delete)
4. Reload page (Ctrl+F5)
5. Check API calls - should go to `https://accountzclub.com/api/v1`

## Quick Check Commands

### Check current .env:
```bash
cat client/.env
```

### Check if build has correct URL:
```bash
# After build, check the compiled JS files
grep -r "localhost:8000" client/dist/assets/
# Should return NOTHING if build is correct
```

### Check what URL frontend is using:
```bash
# In browser console:
console.log(import.meta.env.VITE_API_BASE_URL)
# Should show: https://accountzclub.com/api/v1
```

## Common Mistakes

❌ **Mistake 1:** Building locally with production .env, but not deploying
- **Fix:** Deploy the new `dist` folder to server

❌ **Mistake 2:** .env updated but not rebuilding
- **Fix:** Always rebuild after changing .env

❌ **Mistake 3:** Old browser cache
- **Fix:** Hard refresh (Ctrl+F5) or clear cache

❌ **Mistake 4:** Cloudflare caching old version
- **Fix:** Purge Cloudflare cache

## Verification Checklist

- [ ] `client/.env` has production URLs (no localhost)
- [ ] Frontend rebuilt with `npm run build`
- [ ] New `dist` folder deployed to server
- [ ] Nginx/web server restarted
- [ ] Browser cache cleared
- [ ] Cloudflare cache purged (if applicable)
- [ ] API calls going to `https://accountzclub.com/api/v1`
- [ ] No more 401 Unauthorized errors

## Still Not Working?

### Check CORS Settings

**File:** `backend/.env`

```env
CORS_ALLOWED_ORIGINS=https://accountzclub.com,https://accsclub.cc
ALLOWED_HOSTS=accountzclub.com,accsclub.cc
```

### Check JWT Settings

Tokens might be expired. Users need to:
1. Logout
2. Clear browser storage (localStorage)
3. Login again

### Check Logs

```bash
# Backend logs
tail -f /root/crypto-nexus/backend/logs/cryptonexus.log

# Nginx logs
tail -f /var/log/nginx/error.log
```

## Emergency Rollback

If production is broken:

```bash
# Restore from backup
cp -r /backup/dist/* /var/www/accountzclub.com/html/

# Or rebuild with known good .env
cd /root/crypto-nexus/client
git checkout .env  # Restore from git
npm run build
```
