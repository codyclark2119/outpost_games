#!/bin/bash

# Quick deployment test script
# Tests if all Docker configurations build successfully

set -e

echo "🧪 Testing Docker configurations..."
echo ""

# Test 1: Standard Dockerfile
echo "1️⃣  Testing standard Dockerfile..."
if docker build -t outpost-web-test -f Dockerfile . > /dev/null 2>&1; then
    echo "✅ Standard Dockerfile builds successfully"
    docker rmi outpost-web-test > /dev/null 2>&1
else
    echo "❌ Standard Dockerfile failed"
    exit 1
fi

# Test 2: API Dockerfile  
echo "2️⃣  Testing API Dockerfile..."
if docker build -t outpost-api-test -f api/Dockerfile ./api > /dev/null 2>&1; then
    echo "✅ API Dockerfile builds successfully"
    docker rmi outpost-api-test > /dev/null 2>&1
else
    echo "❌ API Dockerfile failed"
    exit 1
fi

# Test 3: Combined Dockerfile
echo "3️⃣  Testing combined Dockerfile..."
if docker build -t outpost-combined-test -f Dockerfile.combined . > /dev/null 2>&1; then
    echo "✅ Combined Dockerfile builds successfully"
    docker rmi outpost-combined-test > /dev/null 2>&1
else
    echo "⚠️  Combined Dockerfile failed (optional)"
fi

# Test 4: Docker Compose validation
echo "4️⃣  Testing docker-compose configurations..."
if docker-compose -f ../local-dev/docker-compose.yml config > /dev/null 2>&1; then
    echo "✅ Standard docker-compose.yml is valid"
else
    echo "❌ Standard docker-compose.yml is invalid"
    exit 1
fi

if docker-compose -f docker-compose.prod.yml config > /dev/null 2>&1; then
    echo "✅ Production docker-compose.prod.yml is valid"
else
    echo "❌ Production docker-compose.prod.yml is invalid"
    exit 1
fi

echo ""
echo "✨ All tests passed!"
echo ""
echo "Ready to deploy! Choose your method:"
echo "  - Local/VPS: docker-compose -f docker-compose.prod.yml up -d"
echo "  - Fly.io: flyctl deploy"
echo "  - Railway: git push"
echo ""
