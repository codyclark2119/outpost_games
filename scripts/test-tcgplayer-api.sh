#!/bin/bash
# TCGPlayer Listings Test Script

API_URL="http://localhost:3001"

echo "🧪 Testing TCGPlayer Listings API"
echo "=================================="
echo ""

# Test 1: Health Check
echo "1️⃣  Health Check"
curl -s "$API_URL/api/health" | json_pp
echo ""
echo ""

# Test 2: Get Initial Listings
echo "2️⃣  Get Default Listings"
curl -s "$API_URL/api/tcgplayer-listings" | json_pp
echo ""
echo ""

# Test 3: Add a New Listing
echo "3️⃣  Add New Listing (Black Lotus)"
curl -s -X POST "$API_URL/api/tcgplayer-listings" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Black Lotus",
    "setName": "Limited Edition Alpha",
    "price": 125000,
    "condition": "LP",
    "foiling": "Normal",
    "quantityInStock": 1,
    "imageUrl": "https://cards.scryfall.io/normal/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd.jpg",
    "productUrl": "https://www.tcgplayer.com/product/1/magic-alpha-black-lotus"
  }' | json_pp
echo ""
echo ""

# Test 4: Add Another Listing
echo "4⃣  Add New Listing (Sol Ring)"
curl -s -X POST "$API_URL/api/tcgplayer-listings" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sol Ring",
    "setName": "Commander Legends",
    "price": 12.50,
    "condition": "NM",
    "foiling": "Foil",
    "quantityInStock": 3,
    "imageUrl": "https://cards.scryfall.io/normal/front/5/8/58b26011-e103-45c4-a253-900f4e6b2eeb.jpg",
    "productUrl": "https://www.tcgplayer.com/product/223456"
  }' | json_pp
echo ""
echo ""

# Test 5: Get All Listings Again
echo "5️⃣  Get All Listings (should show 3 total)"
curl -s "$API_URL/api/tcgplayer-listings" | json_pp
echo ""
echo ""

echo "✅ Tests Complete!"
echo ""
echo "Next steps:"
echo "- Visit http://localhost:5173/products to see the listings"
echo "- Uncomment the Featured Single Cards section"
echo "- Add the fetch logic in onMounted()"
