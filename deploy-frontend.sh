#!/bin/bash

# ============================================
# PRODUCTION DEPLOYMENT SCRIPT
# ============================================

echo "🚀 Starting Production Deployment..."

# Step 1: Navigate to client directory
cd client || exit

# Step 2: Verify .env has production URLs
echo "📝 Checking .env configuration..."
if grep -q "localhost" .env; then
    echo "❌ ERROR: .env still has localhost URLs!"
    echo "Please update client/.env with production URLs"
    exit 1
fi

echo "✅ .env configuration looks good"

# Step 3: Install dependencies (if needed)
echo "📦 Installing dependencies..."
npm install

# Step 4: Build for production
echo "🏗️  Building frontend for production..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Frontend build successful!"
else
    echo "❌ Frontend build failed!"
    exit 1
fi

# Step 5: Navigate back
cd ..

echo ""
echo "✅ Build Complete! Now deploy the 'dist' folder to your server."
echo ""
echo "Next steps:"
echo "1. Copy client/dist/* to your production server"
echo "2. Restart your web server (Nginx/Apache)"
echo "3. Clear browser cache and test"
