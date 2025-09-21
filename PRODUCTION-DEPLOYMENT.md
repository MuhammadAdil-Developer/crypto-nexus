# CryptoNexus Production Deployment Guide

## CORS Error Fix

The CORS error you were experiencing has been fixed by:

1. **Frontend Configuration**: Updated all API service files to use environment variables instead of hardcoded localhost URLs
2. **Backend CORS Settings**: Properly configured CORS allowed origins for production
3. **Docker Configuration**: Added production environment variables

## Quick Deployment

### Option 1: Using the deployment script
```bash
./deploy-production.sh
```

### Option 2: Manual deployment
```bash
# Set environment variables
export DEBUG=False
export CORS_ALLOWED_ORIGINS="http://94.130.201.44:5000,http://localhost:5000,http://localhost:3000"
export ALLOWED_HOSTS="94.130.201.44,localhost,127.0.0.1"

# Deploy
docker-compose down
docker-compose up --build -d
```

## Environment Variables

### Frontend (.env)
```
VITE_API_BASE_URL=http://94.130.201.44:8000/api/v1
VITE_FRONTEND_URL=http://94.130.201.44:5000
```

### Backend (Docker environment)
```
DEBUG=False
CORS_ALLOWED_ORIGINS=http://94.130.201.44:5000,http://localhost:5000,http://localhost:3000
ALLOWED_HOSTS=94.130.201.44,localhost,127.0.0.1
```

## What was fixed:

1. **Frontend API URLs**: Changed from hardcoded `localhost:8000` to environment variable `VITE_API_BASE_URL`
2. **CORS Configuration**: Added your production IP `94.130.201.44:5000` to allowed origins
3. **Security**: Set `CORS_ALLOW_ALL_ORIGINS = False` for production security
4. **Docker Environment**: Added production environment variables to docker-compose.yml

## Testing the fix:

1. Deploy using the script: `./deploy-production.sh`
2. Check if frontend loads: http://94.130.201.44:5000
3. Try logging in - the CORS error should be resolved
4. Check backend API: http://94.130.201.44:8000/api/v1/

## Troubleshooting:

If you still get CORS errors:
1. Check if both services are running: `docker-compose ps`
2. Check logs: `docker-compose logs`
3. Verify environment variables are set correctly
4. Make sure your server firewall allows ports 5000 and 8000

## URLs after deployment:
- Frontend: http://94.130.201.44:5000
- Backend API: http://94.130.201.44:8000/api/v1/
- Admin Panel: http://94.130.201.44:8000/admin/


