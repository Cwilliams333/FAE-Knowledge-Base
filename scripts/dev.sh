#!/bin/bash
# Easy development script for FAE Knowledge Base

set -e

echo "🚀 Starting FAE Knowledge Base in DEV mode..."

# Stop any running containers
echo "⏹️  Stopping existing containers..."
docker.exe compose down -v --remove-orphans 2>/dev/null || true

# Start dev environment
echo "🔧 Starting development environment..."
docker.exe compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build

# Wait for services
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service status
echo "📊 Service Status:"
docker.exe compose ps

echo "✅ Development environment ready!"
echo "🌐 Frontend: http://172.20.32.1:5174"
echo "🔧 Backend API: http://172.20.32.1:5000"
echo "🔍 Elasticsearch: http://172.20.32.1:9200"