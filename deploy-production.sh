#!/bin/bash

# Production Deployment Script for CryptoNexus
echo "🚀 Starting CryptoNexus Production Deployment..."

# Set production environment variables
export DEBUG=False
export CORS_ALLOWED_ORIGINS="http://94.130.201.44:5000,http://localhost:5000,http://localhost:3000"
export ALLOWED_HOSTS="94.130.201.44,localhost,127.0.0.1"

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Remove old images (optional)
echo "🗑️ Cleaning up old images..."
docker system prune -f

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check service health
echo "🏥 Checking service health..."
docker-compose ps

# Show logs
echo "📋 Recent logs:"
docker-compose logs --tail=50

echo "✅ Deployment completed!"
echo "🌐 Frontend: http://94.130.201.44:5000"
echo "🔧 Backend API: http://94.130.201.44:8000"
echo "📊 Admin Panel: http://94.130.201.44:8000/admin/"


