# Redis Cloud Setup Guide

## Your Redis Cloud Details:
- **Host**: redis-14161.crce219.us-east-1-4.ec2.redns.redis-cloud.com
- **Port**: 14161
- **Username**: admin
- **Password**: CREb5pGY6ja6C

## Setup Steps:

### 1. Get Your Redis Password
1. Go to your Redis Cloud dashboard
2. Find your database "database-MGFMGRPC"
3. Copy the password from the connection details

### 2. Set Environment Variable
Set the `REDIS_URL` environment variable with your credentials:

**Windows (PowerShell):**
```powershell
$env:REDIS_URL="redis://CREb5pGY6ja6C@redis-14161.crce219.us-east-1-4.ec2.redns.redis-cloud.com:14161"
```

**Windows (Command Prompt):**
```cmd
set REDIS_URL=redis://CREb5pGY6ja6C@redis-14161.crce219.us-east-1-4.ec2.redns.redis-cloud.com:14161
```

**Linux/Mac:**
```bash
export REDIS_URL="redis://CREb5pGY6ja6C@redis-14161.crce219.us-east-1-4.ec2.redns.redis-cloud.com:14161"
```

### 3. Test Connection
Run this command to test if Redis is working:
```bash
cd backend
python manage.py shell -c "
import redis
import os
r = redis.from_url(os.environ.get('REDIS_URL', 'redis://database-MGFMGRPC:@redis-14161.crce219.us-east-1-4.ec2.redns.redis-cloud.com:14161'))
print('Redis connection test:', r.ping())
"
```

### 4. Restart Django Server
After setting the environment variable, restart your Django server:
```bash
cd backend
python manage.py runserver
```

## What's Updated:
- ✅ Redis URL configuration in `settings.py`
- ✅ Channel layers configuration for WebSocket support
- ✅ Celery configuration for background tasks
- ✅ Default fallback URL (without password) for testing

## Troubleshooting:
- If you get connection errors, double-check your password
- Make sure the environment variable is set before starting Django
- The Redis Cloud instance should be running and accessible


