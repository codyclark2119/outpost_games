#!/bin/bash

# Quick script to add a TCGPlayer card listing
# Usage: ./add-tcg-card.sh

echo "🃏 Add TCGPlayer Card Listing"
echo "=============================="
echo ""

read -p "Card Name: " CARD_NAME
read -p "Set Name: " SET_NAME
read -p "Price (e.g., 5.99): " PRICE
read -p "Scryfall Image URL: " IMAGE_URL
read -p "TCGPlayer Product URL: " PRODUCT_URL
read -p "Condition (NM/LP/MP/HP): " CONDITION
read -p "Foiling (Normal/Foil): " FOILING
read -p "Quantity in Stock: " QUANTITY

echo ""
echo "Adding card to TCGPlayer listings..."

curl -X POST http://localhost:3001/api/tcgplayer-listings \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$CARD_NAME\",
    \"setName\": \"$SET_NAME\",
    \"price\": $PRICE,
    \"imageUrl\": \"$IMAGE_URL\",
    \"productUrl\": \"$PRODUCT_URL\",
    \"condition\": \"$CONDITION\",
    \"foiling\": \"$FOILING\",
    \"quantityInStock\": $QUANTITY
  }" | python3 -m json.tool

echo ""
echo "✅ Card added successfully!"
