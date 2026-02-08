# Environment Configuration Guide

## Files:
- `.env` - Production configuration (used for deployment)
- `.env.local` - Development configuration (used for local testing)

## Usage:

### For Local Development:
```bash
# Copy .env.local to .env
cp client/.env.local client/.env

# Or on Windows
copy client\.env.local client\.env

# Then run dev server
npm run dev
```

### For Production Build:
```bash
# Make sure .env has production URLs
# client/.env should have:
# VITE_API_BASE_URL=https://accountzclub.com/api/v1

# Build for production
npm run build
```

## Important Notes:

1. **Never commit production credentials to git**
2. **Always check .env before deploying**
3. **Use .env.local for local development**
4. **Production .env should have HTTPS URLs**

## Current Configuration:

### Production (.env):
- API: https://accountzclub.com/api/v1
- Frontend: https://accountzclub.com/

### Development (.env.local):
- API: http://localhost:8000/api/v1
- Frontend: http://localhost:5000/

## Troubleshooting:

### 401 Unauthorized Errors:
- Check if VITE_API_BASE_URL matches your backend URL
- Verify tokens are being sent in Authorization header
- Check CORS settings in backend

### Images not loading:
- Verify API_BASE_URL is correct
- Check media files are accessible
- Verify proxy/nginx configuration

### CORS Errors:
- Update CORS_ALLOWED_ORIGINS in backend .env
- Add your frontend domain to ALLOWED_HOSTS
