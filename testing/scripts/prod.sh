#!/bin/bash
# Easy production script for FAE Knowledge Base

set -e

echo "🚀 Starting FAE Knowledge Base in PRODUCTION mode..."

# Stop any running containers
echo "⏹️  Stopping existing containers..."
docker.exe compose down -v --remove-orphans 2>/dev/null || true

# Start production environment
echo "🏭 Starting production environment..."
docker.exe compose up -d --build

# Wait for services
echo "⏳ Waiting for services to be ready..."
sleep 15

# Check service status
echo "📊 Service Status:"
docker.exe compose ps

echo "✅ Production environment ready!"
echo "🌐 Frontend: http://172.20.32.1:5173"
echo "🔧 Backend API: http://172.20.32.1:5000"
echo "🔍 Elasticsearch: http://172.20.32.1:9200"