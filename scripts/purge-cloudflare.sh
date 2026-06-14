#!/bin/bash

# Script to purge Cloudflare cache for API endpoints
# Usage: ./scripts/purge-cloudflare.sh

echo "🔥 This will purge Cloudflare cache for outpostgamesrgv.com"
echo ""
echo "Manual steps:"
echo "1. Go to https://dash.cloudflare.com"
echo "2. Select 'outpostgamesrgv.com'"
echo "3. Click 'Caching' > 'Configuration'"
echo "4. Click 'Purge Everything'"
echo ""
echo "Testing current cache status..."
echo ""

# Test direct Fly.io URL (no Cloudflare)
echo "📡 Direct Fly.io (no Cloudflare):"
curl -s https://outpost-games-rgv.fly.dev/api/events | jq -r '.[].id' | head -1

echo ""

# Test via Cloudflare
echo "☁️  Via Cloudflare:"
curl -s https://outpostgamesrgv.com/api/events | jq -r '.[].id' | head -1

echo ""
echo "If the IDs above are different, Cloudflare cache needs to be purged!"
