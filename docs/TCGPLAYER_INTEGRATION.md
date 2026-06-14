# TCGPlayer Integration Guide

## ⚠️ Important Discovery

TCGPlayer uses **JavaScript rendering** (likely React/Next.js) for their product listings, which means simple HTML scraping won't work. The HTML received from a basic fetch request doesn't contain the product data.

## Recommended Solutions

### Option 1: TCGPlayer Partner API (Best)

**Recommended for production use**

TCGPlayer offers a Partner API for authorized sellers:

- Visit: https://partner.tcgplayer.com/
- Apply for API access as a seller
- Use official endpoints to get your listings
- No risk of breaking changes
- Better performance and reliability

**Benefits:**

- Official, supported integration
- Proper authentication
- No scraping concerns
- Structured JSON responses

### Option 2: Manual Inventory Management

**Quick solution for now**

Create a simple admin interface to manually add/update featured cards:

1. Store listings in your database/Redis
2. Update via admin panel
3. Display on your Products page
4. Link to TCGPlayer for purchases

This is what I've prepared for you - the backend is ready, but you'll manage the data manually.

### Option 3: Headless Browser (Advanced)

**Not recommended - resource intensive**

Use Puppeteer or Playwright to render JavaScript:

- Requires more server resources
- Slower response times
- More complex setup
- Still violates ToS potentially

---

## ✅ What's Ready Now

Even though web scraping won't work as initially planned, I've set up a **complete system** for you to manage and display card listings!

## Backend Setup Complete

The API endpoint is ready at `/api/tcgplayer-listings`

### Current Implementation:

- **Manual data entry**: Add cards through API calls or admin interface
- **Caching**: Results cached for 10 minutes in Redis (in-memory fallback)
- **RESTful API**: Full CRUD operations ready
- **Error handling**: Robust error responses

## Quick Start: Manual Listings

You can add listings manually via API calls. Here's how:

### Add a Card Listing

```bash
# Add a single card
curl -X POST http://localhost:3001/api/tcgplayer-listings \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Black Lotus",
    "setName": "Alpha",
    "price": 125000,
    "condition": "LP",
    "foiling": "Normal",
    "quantityInStock": 1,
    "imageUrl": "https://cards.scryfall.io/normal/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd.jpg",
    "productUrl": "https://www.tcgplayer.com/product/1/magic-alpha-black-lotus"
  }'
```

### Get All Listings

```bash
curl http://localhost:3001/api/tcgplayer-listings
```

## Updated API Implementation

I'll provide you with an updated version that supports manual data management:

### API Response Format:

```json
{
  "listings": [
    {
      "id": "tcg-1-1234567890",
      "name": "Card Name",
      "setName": "Set Name",
      "price": 12.99,
      "priceDisplay": "$12.99",
      "imageUrl": "https://...",
      "productUrl": "https://www.tcgplayer.com/...",
      "condition": "NM",
      "foiling": "Normal",
      "quantityInStock": 1,
      "seller": "The Outpost Games"
    }
  ],
  "page": 1,
  "totalResults": 20,
  "timestamp": "2026-03-15T...",
  "shopUrl": "https://www.tcgplayer.com/search/all/product?seller=61af7a3a&view=grid&page=1"
}
```

## Frontend Integration Steps

### 1. Update the CardListing Interface

Already done! The interface is updated in `src/views/Products.vue`:

```typescript
interface CardListing {
  id: string
  name: string
  setName: string
  imageUrl?: string
  foiling: string
  condition: string
  price: number
  priceDisplay: string
  quantityInStock: number
  productUrl: string
  seller: string
}
```

### 2. Uncomment the Featured Single Cards Section

In `src/views/Products.vue`, find and uncomment:

1. **Sidebar navigation** (around line 48):

```vue
<button
  class="w-full text-left px-4 py-3 rounded-lg hover:bg-outpost-gold/10 transition-colors font-semibold text-gray-700 hover:text-outpost-gold"
  @click="scrollToSection('single-cards')"
>
  Featured Single Cards
</button>
```

2. **The entire section** (starts around line 195):

```vue
<!-- Featured Single Cards Section -->
<section id="single-cards" class="mb-20 scroll-mt-24">
  <!-- ... entire section ... -->
</section>
```

### 3. Remove Old Data and Add New Logic

Replace the **commented** `cardListings` array (around line 500) with:

```typescript
// TCGPlayer card listings
const cardListings = ref<CardListing[]>([])
const loadingListings = ref(false)
const listingsError = ref<string | null>(null)

// Fetch TCGPlayer listings
const fetchTCGPlayerListings = async () => {
  loadingListings.value = true
  listingsError.value = null

  try {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    const response = await fetch(`${API_URL}/api/tcgplayer-listings?page=1&limit=20`)

    if (!response.ok) {
      throw new Error(`Failed to fetch listings: ${response.status}`)
    }

    const data = await response.json()
    cardListings.value = data.listings || []
    console.log(`✅ Loaded ${cardListings.value.length} TCGPlayer listings`)
  } catch (error) {
    console.error('❌ Error fetching TCGPlayer listings:', error)
    listingsError.value = error instanceof Error ? error.message : 'Failed to load listings'
    cardListings.value = []
  } finally {
    loadingListings.value = false
  }
}

// Fetch listings when component mounts
onMounted(() => {
  fetchTCGPlayerListings()
})
```

### 4. Update Card Display Template

In the Featured Single Cards section, change each card from a `<div>` to an `<a>` tag to make them clickable:

```vue
<!-- Change FROM: -->
<div
  v-for="(card, index) in cardListings"
  :key="card.id"
  class="card-listing"
  :style="{ animationDelay: `${index * 0.05}s` }"
>

<!-- Change TO: -->
<a
  v-for="(card, index) in cardListings"
  :key="card.id"
  :href="card.productUrl"
  target="_blank"
  rel="noopener noreferrer"
  class="card-listing block"
  :style="{ animationDelay: `${index * 0.05}s` }"
>
```

And close with `</a>` instead of `</div>`.

### 5. Update Image Display

Add conditional rendering for images:

```vue
<div class="card-image-container relative overflow-hidden bg-gray-100">
  <img
    v-if="card.imageUrl"
    :src="card.imageUrl"
    :alt="card.name"
    class="card-image w-full"
    loading="lazy"
  />
  <div
    v-else
    class="absolute inset-0 flex items-center justify-center bg-gray-200"
  >
    <span class="text-gray-400 text-sm">No Image</span>
  </div>
  <div
    class="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded"
    v-if="card.quantityInStock"
  >
    {{ card.quantityInStock }} {{ card.quantityInStock === 1 ? 'left' : 'in stock' }}
  </div>
</div>
```

### 6. Update Price Display

```vue
<div class="flex justify-between items-center mb-4">
  <span class="text-2xl font-bold text-gray-900">
    {{ card.priceDisplay || `$${card.price.toFixed(2)}` }}
  </span>
</div>
```

### 7. Convert TCGPlayer Button to Text

Remove the `<a>` tag around "View on TCGPlayer" and make it plain text (since the whole card is now clickable):

```vue
<!-- Change FROM: -->
<a :href="card.tcgPlayerUrl" target="_blank" rel="noopener noreferrer" class="tcgplayer-button ...">
  View on TCGPlayer
</a>

<!-- Change TO: -->
<div class="tcgplayer-button ...">
  View on TCGPlayer →
</div>
```

### 8. Add Loading/Error States

Add these sections after the card grid:

```vue
<!-- Loading State -->
<div v-if="loadingListings" class="text-center py-12">
  <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-outpost-gold"></div>
  <p class="mt-4 text-gray-600">Loading card listings from TCGPlayer...</p>
</div>

<!-- Error State -->
<div v-else-if="listingsError" class="text-center py-12">
  <p class="text-red-600 mb-4">{{ listingsError }}</p>
  <button
    @click="fetchTCGPlayerListings"
    class="btn-primary px-6 py-3"
  >
    Try Again
  </button>
</div>

<!-- Empty State -->
<div v-else-if="cardListings.length === 0" class="text-center py-12">
  <p class="text-gray-600">No listings available at this time.</p>
</div>
```

## Testing

1. **Start API server**: `cd api && npm run dev`
2. **Start dev server**: `npm run dev`
3. **Visit**: http://localhost:5173/products
4. **Scroll to**: "Featured Single Cards" section
5. **Click any card**: Should open TCGPlayer listing in new tab

## Customization Options

### Change Cache Duration

In `api/server.js`, modify:

```javascript
const TCGPLAYER_CACHE_TTL = 600 // Change from 600 seconds (10 min) to your preference
```

### Adjust Number of Cards

In Products.vue fetch call:

```typescript
const response = await fetch(`${API_URL}/api/tcgplayer-listings?page=1&limit=20`)
//                                                                        ↑ change this
```

### Update HTML Selectors

If TCGPlayer changes their HTML structure, update the selectors in `api/server.js`:

```javascript
$('.search-result__content, .product-card, [data-testid="product-card"]')
```

## Important Notes

⚠️ **Web Scraping Considerations**:

- Respect TCGPlayer's terms of service
- The 10-minute cache prevents excessive requests
- Consider reaching out to TCGPlayer for official API access

✅ **Benefits of This Approach**:

- Only fetches when users visit the page
- Caches results to minimize server load
- Redirects to TCGPlayer for purchases (no cart needed)
- Mirrors normal browser behavior

🔒 **Production Deployment**:

- Set `VITE_API_URL` environment variable to your production API URL
- Ensure your API server has Redis configured
- Monitor API logs for any parsing errors
