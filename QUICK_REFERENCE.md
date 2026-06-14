# Quick Reference

## Dev Servers

```bash
# Frontend (http://localhost:5173)
npm run dev

# API (http://localhost:3001)
cd api && npm run dev

# Full stack with Docker
npm run docker:up
```

## Admin Panel

Access at `/x/outpostAdmin` (not linked from public nav).

| Task | Path |
|---|---|
| Dashboard | `/x/outpostAdmin` |
| Add special event | `/x/outpostAdmin/events/add` |
| Manage events | `/x/outpostAdmin/events` |
| Add set / product | `/x/outpostAdmin/products/add` |
| Manage products + visibility | `/x/outpostAdmin/products` |
| Add card listing | `/x/outpostAdmin/tcgplayer/add` |
| Manage card listings | `/x/outpostAdmin/tcgplayer` |

## API Endpoints

```bash
# Health
GET  /api/health

# Special events
GET    /api/events
POST   /api/events
PUT    /api/events/:id
DELETE /api/events/:id
POST   /api/events/reset

# Product catalog
GET    /api/products
POST   /api/products/types
PUT    /api/products/types/:typeId
DELETE /api/products/types/:typeId
POST   /api/products/types/:typeId/sets
PUT    /api/products/sets/:setId
DELETE /api/products/sets/:setId
POST   /api/products/sets/:setId/products
PUT    /api/products/items/:itemId
DELETE /api/products/items/:itemId

# TCGPlayer card listings
GET    /api/tcgplayer-listings
POST   /api/tcgplayer-listings
PUT    /api/tcgplayer-listings/:id
DELETE /api/tcgplayer-listings/:id
DELETE /api/tcgplayer-listings   (clear all)
```

## Adding a Card Listing via curl

```bash
curl -X POST http://localhost:3001/api/tcgplayer-listings \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Lightning Bolt",
    "setName": "Modern Masters 2015",
    "price": 5.99,
    "condition": "NM",
    "foiling": "Normal",
    "quantityInStock": 4,
    "imageUrl": "https://cards.scryfall.io/normal/front/...",
    "productUrl": "https://www.tcgplayer.com/product/..."
  }'
```

## Adding a Featured Slide (Home Page)

Edit the `featuredSlides` array in `src/views/Home.vue`:

```ts
const featuredSlides: FeaturedSlide[] = [
  {
    id: 'my-set',
    title: 'Featured: My Set Name',
    subtitle: 'Short description here',
    imageUrl: '/wpn-assets/my-set/posters/poster.jpg',
    linkTo: '/products/magic?set=my-set-id',
    linkText: 'Shop Now',
  },
]
```

## Product Visibility

Hide out-of-stock items without deleting: go to **Manage Products** and click the eye icon on any type, set, or product row. Hidden items are preserved in Redis and can be re-shown any time.

## Deploy

```bash
flyctl deploy
./scripts/purge-cloudflare.sh  # Clear CDN cache
```
