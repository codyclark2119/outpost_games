#!/bin/bash

# Setup script for Outpost Games local development domain
# This script adds outpostgamesrgv.test to your hosts file

DOMAIN="outpostgamesrgv.test"
HOST_IP="127.0.0.1"
HOSTS_FILE="/etc/hosts"

echo "🎮 Setting up Outpost Games local domain..."
echo ""

# Check if domain already exists in hosts file
if grep -q "$DOMAIN" "$HOSTS_FILE"; then
    echo "✅ Domain $DOMAIN already exists in $HOSTS_FILE"
else
    echo "📝 Adding $DOMAIN to $HOSTS_FILE"
    echo "   This requires sudo permissions..."
    echo ""
    
    # Add domain to hosts file
    echo "$HOST_IP $DOMAIN" | sudo tee -a "$HOSTS_FILE" > /dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added $DOMAIN to hosts file"
    else
        echo "❌ Failed to add domain to hosts file"
        exit 1
    fi
fi

echo ""
echo "🚀 Setup complete! You can now access the application at:"
echo "   http://$DOMAIN"
echo ""
echo "To start the application, run:"
echo "   docker-compose up -d"
echo ""
