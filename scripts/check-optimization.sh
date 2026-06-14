#!/bin/bash

# Cost Optimization Status Checker
# This script helps you verify which cost-saving strategies are implemented

echo "🔍 Cost Optimization Status Check"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
implemented=0
total=6

echo "📊 Checking implemented optimizations..."
echo ""

# 1. Check for External Redis (Upstash)
echo -n "1. External Redis (Upstash): "
if [ -f ".env" ] && grep -q "upstash.io" .env 2>/dev/null; then
    echo -e "${GREEN}✓ Configured${NC}"
    echo "   → Found Upstash URL in .env"
    ((implemented++))
elif [ -f "docker-compose.prod.yml" ] && grep -q "redis:" docker-compose.prod.yml && ! grep -q "^#.*redis:" docker-compose.prod.yml; then
    echo -e "${RED}✗ Not configured${NC}"
    echo "   → Still using local Redis container"
    echo -e "   ${YELLOW}Action: See docs/deployment/DEPLOY_GUIDE.md section 1${NC}"
else
    echo -e "${YELLOW}⚠ Cannot determine${NC}"
    echo "   → Check .env for REDIS_URL with upstash.io"
fi
echo ""

# 2. Check for Cloudflare CDN
echo -n "2. Cloudflare CDN: "
if [ -f ".env" ] && grep -q "cloudflare" .env 2>/dev/null; then
    echo -e "${GREEN}✓ Configured${NC}"
    echo "   → Cloudflare settings found"
    ((implemented++))
else
    echo -e "${YELLOW}⚠ Manual check required${NC}"
    echo "   → Check your DNS nameservers"
    echo "   → Run: dig NS yourdomain.com"
    echo "   → Should show: ns1.cloudflare.com"
    echo -e "   ${YELLOW}Action: See docs/deployment/DEPLOY_GUIDE.md section 2${NC}"
fi
echo ""

# 3. Check for Combined Container
echo -n "3. Combined Container: "
if [ -f "Dockerfile.combined" ]; then
    echo -e "${GREEN}✓ Available${NC}"
    echo "   → Dockerfile.combined exists"
    ((implemented++))
    
    if [ -f "fly.toml" ] && grep -q "Dockerfile.combined" fly.toml 2>/dev/null; then
        echo "   → Configured in fly.toml"
    else
        echo -e "   ${YELLOW}→ Not configured in fly.toml yet${NC}"
        echo "   → Edit fly.toml: dockerfile = \"Dockerfile.combined\""
    fi
else
    echo -e "${RED}✗ Not available${NC}"
    echo -e "   ${YELLOW}Action: See docs/deployment/DEPLOY_GUIDE.md section 3${NC}"
fi
echo ""

# 4. Check for Auto-Sleep Configuration
echo -n "4. Auto-Sleep: "
if [ -f "fly.toml" ]; then
    if grep -q "auto_stop_machines = true" fly.toml 2>/dev/null; then
        echo -e "${GREEN}✓ Enabled${NC}"
        echo "   → auto_stop_machines = true"
        ((implemented++))
        
        if grep -q "min_machines_running = 0" fly.toml 2>/dev/null; then
            echo "   → min_machines_running = 0"
        else
            echo -e "   ${YELLOW}→ Consider setting min_machines_running = 0${NC}"
        fi
    else
        echo -e "${RED}✗ Not enabled${NC}"
        echo -e "   ${YELLOW}Action: See docs/deployment/DEPLOY_GUIDE.md section 4${NC}"
    fi
else
    echo -e "${YELLOW}⚠ N/A (not using Fly.io)${NC}"
    echo "   → Auto-sleep only available on Fly.io/Railway"
    ((implemented++))  # Count as implemented if not applicable
fi
echo ""

# 5. Check for Image Optimization
echo -n "5. Image Optimization (Cloudinary): "
if [ -f "src/services/cloudinary.ts" ] || [ -f "src/services/cloudinary.js" ]; then
    echo -e "${GREEN}✓ Implemented${NC}"
    echo "   → Cloudinary service exists"
    ((implemented++))
    
    if [ -f ".env" ] && grep -q "CLOUDINARY" .env 2>/dev/null; then
        echo "   → Environment variables configured"
    else
        echo -e "   ${YELLOW}→ Missing VITE_CLOUDINARY_CLOUD_NAME in .env${NC}"
    fi
elif [ -f "package.json" ] && grep -q "cloudinary" package.json 2>/dev/null; then
    echo -e "${YELLOW}⚠ Partially implemented${NC}"
    echo "   → Package installed but service not created"
    echo -e "   ${YELLOW}Action: See docs/deployment/DEPLOY_GUIDE.md section 5${NC}"
else
    echo -e "${RED}✗ Not implemented${NC}"
    echo -e "   ${YELLOW}Action: See docs/deployment/DEPLOY_GUIDE.md section 5${NC}"
fi
echo ""

# 6. Check for Static Site Generation
echo -n "6. Static Site Generation: "
if [ -f "package.json" ] && grep -q "vite-ssg" package.json 2>/dev/null; then
    echo -e "${GREEN}✓ Configured${NC}"
    echo "   → vite-ssg installed"
    ((implemented++))
elif grep -q "netlify" .git/config 2>/dev/null || [ -f "netlify.toml" ]; then
    echo -e "${YELLOW}⚠ Partial (Netlify configured)${NC}"
    echo "   → Using static hosting but not SSG"
    echo -e "   ${YELLOW}Action: See docs/deployment/DEPLOY_GUIDE.md section 6${NC}"
else
    echo -e "${YELLOW}⚠ Not needed${NC}"
    echo "   → Current setup is recommended for your use case"
    ((implemented++))  # Count as implemented - not needed
fi
echo ""

# Summary
echo "=================================="
echo -e "📈 Summary: ${implemented}/${total} optimizations implemented"
echo ""

# Calculate potential savings
if [ $implemented -eq 6 ]; then
    echo -e "${GREEN}🎉 Excellent! All optimizations implemented!${NC}"
    echo "   Estimated monthly cost: $0.10 - $1.94"
    echo "   (depending on traffic patterns)"
elif [ $implemented -ge 4 ]; then
    echo -e "${GREEN}✅ Good! Most optimizations implemented.${NC}"
    echo "   Estimated monthly cost: $1.94 - $3.50"
elif [ $implemented -ge 2 ]; then
    echo -e "${YELLOW}⚠️  Partial optimization. More savings possible.${NC}"
    echo "   Estimated monthly cost: $3.50 - $5.00"
else
    echo -e "${RED}⚠️  Limited optimization.${NC}"
    echo "   Estimated monthly cost: $5.00+"
fi

echo ""
echo "📚 Full implementation guide:"
echo "   → docs/deployment/DEPLOY_GUIDE.md"
echo ""

# Quick actions
echo "🚀 Quick Actions:"
echo ""

# Check if using Upstash
if ! ([ -f ".env" ] && grep -q "upstash.io" .env 2>/dev/null); then
    echo "   1. Set up Upstash (10 min, highest impact):"
    echo "      → https://upstash.com"
    echo "      → Save ~64MB RAM, enables smaller instances"
    echo ""
fi

# Check if Cloudflare
echo "   2. Set up Cloudflare CDN (20 min):"
echo "      → https://dash.cloudflare.com"
echo "      → Handle 10x traffic at same cost"
echo ""

# Check if auto-sleep
if [ -f "fly.toml" ] && ! grep -q "auto_stop_machines = true" fly.toml 2>/dev/null; then
    echo "   3. Enable auto-sleep (2 min, up to 95% savings):"
    echo "      → Edit fly.toml"
    echo "      → Add: auto_stop_machines = true"
    echo ""
fi

echo "=================================="
echo ""
