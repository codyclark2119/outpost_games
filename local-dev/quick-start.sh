#!/bin/bash

# Quick start script for Outpost Games
# Sets up domain and starts Docker containers

set -e

echo "🎮 Outpost Games - Quick Start"
echo "==============================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install Docker Compose:"
    echo "   https://docs.docker.com/compose/install/"
    exit 1
fi

# Set up custom domain
echo "📝 Step 1: Setting up custom domain..."
chmod +x setup-domain.sh
./setup-domain.sh

echo ""
echo "📦 Step 2: Installing API dependencies..."
cd ../api
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "   ✅ API dependencies already installed"
fi
cd ../local-dev

echo ""
echo "🐳 Step 3: Building and starting Docker containers..."
docker-compose up -d --build

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check if services are healthy
echo ""
echo "🔍 Checking service health..."

if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "   ✅ API is running"
else
    echo "   ⚠️  API may still be starting..."
fi

if curl -s http://localhost > /dev/null; then
    echo "   ✅ Frontend is running"
else
    echo "   ⚠️  Frontend may still be starting..."
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🌐 Access your application:"
echo "   • Main site:    http://outpostgamesrgv.test"
echo "   • Admin panel:  http://outpostgamesrgv.test/x/outpostAdmin"
echo "   • Alternative:  http://localhost"
echo ""
echo "📊 View logs:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 Stop services:"
echo "   docker-compose down"
echo ""
