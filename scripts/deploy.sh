#!/bin/bash

# Production Deployment Script for The Outpost Games
# Optimized for low-cost deployment

set -e  # Exit on error

echo "🚀 Starting Production Deployment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Warning: .env file not found${NC}"
    echo "Creating from .env.example..."
    cp .env.example .env
    echo -e "${YELLOW}Please edit .env with your production values${NC}"
    exit 1
fi

# Function to check if docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Docker is running${NC}"
}

# Function to run pre-deployment checks
pre_deploy_checks() {
    echo ""
    echo "🔍 Running pre-deployment checks..."
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}⚠️  node_modules not found. Installing dependencies...${NC}"
        npm install
    fi
    
    # Run format check
    echo "📝 Checking code formatting..."
    if npm run format:check; then
        echo -e "${GREEN}✓ Code formatting is correct${NC}"
    else
        echo -e "${RED}❌ Code formatting issues detected${NC}"
        echo -e "${YELLOW}Run 'npm run format' to fix${NC}"
        exit 1
    fi
    
    # Run linting
    echo "🔎 Running ESLint..."
    if npm run lint; then
        echo -e "${GREEN}✓ Linting passed${NC}"
    else
        echo -e "${RED}❌ Linting errors detected${NC}"
        echo -e "${YELLOW}Run 'npm run lint:fix' to fix auto-fixable issues${NC}"
        exit 1
    fi
    
    # Run type checking
    echo "🔧 Running TypeScript type checking..."
    if npm run type-check; then
        echo -e "${GREEN}✓ Type checking passed${NC}"
    else
        echo -e "${RED}❌ Type errors detected${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ All pre-deployment checks passed${NC}"
}

# Function to clean old images
cleanup() {
    echo ""
    echo "🧹 Cleaning up old images..."
    docker system prune -f
    echo -e "${GREEN}✓ Cleanup complete${NC}"
}

# Function to deploy with docker-compose
deploy_docker_compose() {
    echo ""
    echo "📦 Building and deploying with Docker Compose..."
    
    # Run pre-deployment checks
    pre_deploy_checks
    
    # Stop existing containers
    docker-compose down
    
    # Build with production config
    docker-compose -f docker-compose.prod.yml build --no-cache
    
    # Start containers
    docker-compose -f docker-compose.prod.yml up -d
    
    echo -e "${GREEN}✓ Deployment complete${NC}"
}

# Function to deploy to Fly.io
deploy_flyio() {
    echo ""
    echo "🪰 Deploying to Fly.io..."
    
    # Run pre-deployment checks
    pre_deploy_checks
    
    # Check if flyctl is installed
    if ! command -v flyctl &> /dev/null; then
        echo -e "${RED}❌ flyctl not found${NC}"
        echo "Install with: curl -L https://fly.io/install.sh | sh"
        exit 1
    fi
    
    # Check if logged in
    if ! flyctl auth whoami &> /dev/null; then
        echo "Please login to Fly.io first:"
        flyctl auth login
    fi
    
    # Deploy
    flyctl deploy --remote-only
    
    echo -e "${GREEN}✓ Fly.io deployment complete${NC}"
}

# Function to check health
check_health() {
    echo ""
    echo "🏥 Checking application health..."
    
    sleep 5  # Wait for services to start
    
    # Check web
    if curl -f http://localhost/ > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Web service is healthy${NC}"
    else
        echo -e "${RED}❌ Web service is down${NC}"
    fi
    
    # Check API
    if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ API service is healthy${NC}"
    else
        echo -e "${RED}❌ API service is down${NC}"
    fi
}

# Function to show logs
show_logs() {
    echo ""
    echo "📋 Recent logs:"
    docker-compose logs --tail=20
}

# Function to show resource usage
show_stats() {
    echo ""
    echo "📊 Resource usage:"
    docker stats --no-stream
}

# Main deployment options
echo "Choose deployment method:"
echo "1) Docker Compose (local/VPS)"
echo "2) Fly.io"
echo "3) Health Check Only"
echo "4) Show Logs"
echo "5) Show Stats"
echo "6) Cleanup"
echo ""
read -p "Enter choice [1-6]: " choice

case $choice in
    1)
        check_docker
        deploy_docker_compose
        check_health
        show_stats
        ;;
    2)
        deploy_flyio
        ;;
    3)
        check_health
        ;;
    4)
        show_logs
        ;;
    5)
        show_stats
        ;;
    6)
        cleanup
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✨ Done!${NC}"
echo ""
echo "📝 Useful commands:"
echo "  - View logs: docker-compose logs -f"
echo "  - Stop: docker-compose down"
echo "  - Restart: docker-compose restart"
echo "  - Stats: docker stats"
echo ""
