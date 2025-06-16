#!/bin/bash
# Easy testing script for FAE Knowledge Base

set -e

echo "🧪 Starting FAE Knowledge Base in TEST mode..."

# Stop any running containers
echo "⏹️  Stopping existing containers..."
docker.exe compose down -v --remove-orphans 2>/dev/null || true

# Start test environment
echo "🚀 Starting test environment..."
docker.exe compose -f docker-compose.yml -f docker-compose.test.yml up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service status
echo "📊 Service Status:"
docker.exe compose ps

# Wait for ingest to complete
echo "📄 Waiting for document ingestion to complete..."
timeout 60s bash -c 'while docker.exe compose ps | grep -q "kb-ingest.*Up"; do sleep 2; done' || echo "Ingest service completed or timed out"

# Wait for backend to be healthy
echo "🔍 Waiting for backend API to be ready..."
timeout 60s bash -c 'until curl -f http://172.20.32.1:5000/health 2>/dev/null; do sleep 2; done' || echo "Backend health check failed or timed out"

# Run tests
echo "🧪 Running backend tests..."
docker.exe compose exec backend python -m pytest tests/ -v --tb=short

echo "✅ Tests completed!"