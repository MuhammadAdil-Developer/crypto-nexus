# Frontend Dockerfile - moved to Dockerfile.frontend
# This is now the main Dockerfile for development
FROM node:18-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source
COPY . .

# Build frontend
RUN npm run build

# Expose port
EXPOSE 5000

# Start command
CMD ["npm", "run", "start:prod"] 