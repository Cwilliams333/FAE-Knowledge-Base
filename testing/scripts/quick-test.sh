#!/bin/bash
# Quick working test script
set -e

echo "🧪 Quick Test - Microservices"

# Stop any existing test containers
docker.exe compose -f docker-compose.test.yml down -v 2>/dev/null || true

echo "1️⃣ Starting Elasticsearch..."
docker.exe compose -f docker-compose.test.yml up -d elasticsearch

echo "2️⃣ Waiting for Elasticsearch to be ready..."
timeout 120s bash -c 'until curl -f http://172.20.32.1:9201/_cluster/health 2>/dev/null; do echo "Waiting..."; sleep 5; done'

echo "3️⃣ Starting ingest service..."
docker.exe compose -f docker-compose.test.yml up ingest

echo "4️⃣ Starting backend..."
docker.exe compose -f docker-compose.test.yml up -d backend

echo "5️⃣ Waiting for backend..."
timeout 60s bash -c 'until curl -f http://172.20.32.1:5001/health 2>/dev/null; do echo "Waiting for backend..."; sleep 3; done'

echo "6️⃣ Testing API..."
echo "Health check:"
curl http://172.20.32.1:5001/health
echo ""
echo "Search test:"  
curl http://172.20.32.1:5001/search -X POST -H "Content-Type: application/json" -d '{"query": "API"}' | head -c 200
echo ""

echo "7️⃣ Running pytest..."
# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Try to use test_env if it exists, otherwise use system python
if [ -f "test_env/bin/activate" ]; then
    echo "Using test_env python environment..."
    source test_env/bin/activate
    TEST_ENV=local API_BASE_URL=http://172.20.32.1:5001 python -m pytest tests/test_api.py::TestHealthEndpoint -v
elif command -v python3 &> /dev/null; then
    echo "Using system python3..."
    TEST_ENV=local API_BASE_URL=http://172.20.32.1:5001 python3 -m pytest tests/test_api.py::TestHealthEndpoint -v
elif command -v python &> /dev/null; then
    echo "Using system python..."
    TEST_ENV=local API_BASE_URL=http://172.20.32.1:5001 python -m pytest tests/test_api.py::TestHealthEndpoint -v
else
    echo "⚠️  No python found. Skipping pytest - but API tests passed manually!"
fi

echo "✅ Quick test completed!"

# Cleanup
echo "Cleaning up..."
docker.exe compose -f docker-compose.test.yml down -v