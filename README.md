# The Outpost Games

Web application for **The Outpost Games**, a TCG card shop in Rio Grande City, Texas. Covers Magic: The Gathering, Pokémon, One Piece Card Game, Gundam Card Game, and Riftbound.

**Live site:** https://outpostgamesrgv.com

The public site is a single page (`src/views/Home.vue`) plus two standalone routes, `/products` (Square-backed live inventory, gated by the `VITE_PRODUCTS_PAGE_LIVE` build-time env var — see `src/config/featureFlags.ts`) and `/events`. `/about` and `/contact` redirect to in-page sections (`/#about`, `/#contact`) rather than 404ing, for anyone with an old bookmark or inbound link.

---

## Store Info

- **Address:** 605 W. Main Street, Suite 4, Rio Grande City, TX 78582
- **Email:** theoutpostgamingrgv@gmail.com
- **Hours:** Thursday–Sunday, 5:00 PM – 10:00 PM
- **Facebook:** https://www.facebook.com/Theoutpostgames/
- **Instagram:** https://www.instagram.com/theoutpostgames_rgc
- **Discord:** https://discord.gg/PW3YkMtFmz

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vue 3 + TypeScript, Vite, Tailwind CSS v4 |
| State | Pinia (composition-API stores) |
| Routing | Vue Router 4 |
| Backend | Node.js + Express (no TypeScript) |
| Persistence | Redis (Upstash in prod, Docker locally) |
| Reverse proxy | Nginx |
| Hosting | Fly.io (Dallas region) |
| CDN | Cloudflare |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Frontend

```bash
npm install
npm run dev          # Vite dev server → http://localhost:5173
npm run dev:all      # Vite + api dev server together (via concurrently)
npm run build        # Type-check + production build
npm run type-check   # vue-tsc --noEmit
npm run lint         # ESLint
npm run lint:fix     # ESLint auto-fix
npm run format       # Prettier write
npm run pre-deploy   # format:check + lint + type-check
npm run clean        # Remove dist/
```

The dev server proxies `/api` requests to `http://localhost:3001`.

### API

```bash
cd api && npm install
npm run dev    # node --watch server.js → http://localhost:3001
npm start      # production
npm test       # node --test tests/*.test.js
```

Health check: `http://localhost:3001/api/health`

### Local Full-Stack (Docker)

```bash
npm run docker:setup       # First-time setup
npm run docker:up          # Start existing containers
npm run docker:rebuild     # Rebuild ALL images, then start (use after any code change)
npm run docker:rebuild:web # Rebuild the frontend image only (faster — skips API/Redis)
npm run docker:restart     # Restart running containers
npm run docker:logs        # Tail logs
npm run docker:down        # Stop
```

See `local-dev/README.md` for details.

---

## Developer Tooling

- **ESLint** (`eslint.config.js`, flat config) — JS/TS + Vue 3 rules. `npm run lint` / `npm run lint:fix`.
- **Prettier** (`.prettierrc`) — single quotes, no semicolons, 100-char width. `npm run format` / `npm run format:check`.
- **TypeScript** — `npm run type-check` (`vue-tsc --noEmit`).
- **Pre-deploy gate** — `npm run pre-deploy` runs format:check + lint + type-check; run it before every deploy.
- **VS Code** — recommended extensions in `.vscode/extensions.json` (ESLint, Prettier, Volar, TypeScript Vue Plugin); `.vscode/settings.json` enables format-on-save and ESLint auto-fix.
- **API tests** — `cd api && npm test` runs the native `node:test` suite in `api/tests/`.

---

## Project Structure

```
├── src/
│   ├── views/
│   │   ├── Home.vue              # One-page site: hero, marketing posters carousel, games, about, Discord/Instagram, contact
│   │   ├── home-sections/         # Async-loaded Home sections (code-split below the fold)
│   │   │   ├── MultiTcgShowcase.vue
│   │   │   └── SocialCtaSection.vue    # Discord + Instagram CTA cards
│   │   ├── Products.vue          # Square-backed product catalog (carousels per game type); gated by VITE_PRODUCTS_PAGE_LIVE
│   │   ├── ProductsGameType.vue  # Single game type browse page with filters
│   │   ├── Events.vue            # Weekly schedule + upcoming special events
│   │   ├── Terms.vue
│   │   ├── Privacy.vue
│   │   └── admin/                # Admin pages (route: /x/outpostAdmin)
│   │       ├── AdminDashboard.vue
│   │       ├── AdminEvents.vue         # Manage special events
│   │       ├── AdminEventsAdd.vue      # Add event
│   │       ├── AdminProducts.vue       # Manage product catalog (tree view)
│   │       ├── AdminProductsAdd.vue    # Add game types / sets / products
│   │       ├── AdminTCGPlayerPage.vue  # Manage single card listings
│   │       ├── AdminTCGPlayerAdd.vue   # Add card listing
│   │       ├── AdminSquareCatalog.vue      # Square catalog editor (items/variations/categories/images)
│   │       ├── AdminSquareStock.vue        # Square stock report (CSV export)
│   │       ├── AdminSquareSales.vue        # Square sales-over-time charts
│   │       └── AdminSquareMassInventory.vue # Bulk inventory count corrections
│   ├── stores/
│   │   ├── events.ts         # Special events CRUD (Pinia)
│   │   ├── products.ts       # Product catalog CRUD (Pinia)
│   │   ├── squareCatalog.ts  # Live Square inventory for the public /products page (Pinia)
│   │   └── cart.ts           # Cart state (reserved for future e-commerce)
│   ├── components/
│   │   ├── AppHeader.vue     # Nav — real routes (Products/Events) + in-page anchors (About/Contact)
│   │   └── AppFooter.vue
│   ├── composables/
│   │   ├── useSectionNav.ts  # In-page section navigation (same-page scroll or cross-route + hash)
│   │   └── usePageMeta.ts    # Per-route <title>/meta/canonical (@unhead/vue)
│   ├── config/
│   │   ├── storeInfo.ts        # Single source of truth for address/hours/email/social links
│   │   └── weeklySchedule.ts    # Canonical weekly recurring event schedule
│   ├── main.ts            # App entry + Vue Router setup
│   ├── App.vue
│   └── style.css          # Tailwind + brand theme variables
├── api/
│   ├── server.js             # Express API (events, products, TCGPlayer listings, Square routes)
│   ├── auth.js                # Redis-backed admin session auth
│   ├── squarePosClient.js     # Square Catalog/Inventory API client
│   ├── squareOrdersClient.js  # Square Orders API client (sales reporting)
│   ├── inventoryExport.js     # Monthly inventory .xlsx export + scheduler
│   ├── mailClient.js          # Gmail SMTP wrapper (nodemailer)
│   └── scripts/               # Maintenance CLI tools — see "Square POS Catalog Admin" below
├── local-dev/             # Docker dev environment
├── scripts/               # Deployment utilities
├── docs/                  # Deployment documentation
├── public/                # Static assets (robots.txt, sitemap, manifest)
├── Dockerfile             # Frontend (Nginx static)
├── Dockerfile.combined    # Combined container (Nginx + Node.js API) — used in prod
├── docker-compose.prod.yml
├── fly.toml               # Fly.io production config
└── nginx.*.conf           # Nginx configs for various environments
```

---

## Admin Panel

The admin is intentionally not linked from the public navigation. Access it at:

```
/x/outpostAdmin
```

### What the admin manages

| Section | Route | Description |
|---|---|---|
| Dashboard | `/x/outpostAdmin` | Overview with links to all sections |
| Manage Events | `/x/outpostAdmin/events` | Edit/delete special tournament events |
| Add Event | `/x/outpostAdmin/events/add` | Create event with game type association |
| Manage Products | `/x/outpostAdmin/products` | Tree view: Types → Sets → Products with visibility toggles |
| Add Products | `/x/outpostAdmin/products/add` | Add game types, sets, or individual products |
| Manage Listings | `/x/outpostAdmin/tcgplayer` | Edit/delete featured single card listings |
| Add Listing | `/x/outpostAdmin/tcgplayer/add` | Add a TCGPlayer card listing |
| Square Catalog | `/x/outpostAdmin/square-catalog` | Edit Square items/variations, categories, images, deletion |
| Square Stock Report | `/x/outpostAdmin/square-stock` | Read-only inventory report, CSV export |
| Square Sales | `/x/outpostAdmin/square-sales` | Revenue/order/AOV trends, category + payment-method + day-of-week/hour-of-day breakdowns, and a sortable/filterable top-products table with per-product profit |
| Square Mass Inventory | `/x/outpostAdmin/square-mass-inventory` | Bulk on-hand count corrections in one save |

---

## API Reference

```bash
# Health
GET  /api/health

# Special events
GET    /api/events
POST   /api/events
PUT    /api/events/:id
DELETE /api/events/:id

# Homepage marketing posters carousel — auto-populated from public/wpn-assets/posters/
GET    /api/marketing-posters

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

# Square POS (admin auth required except /status)
GET  /api/square/status
GET  /api/square/inventory-report
GET  /api/square/categories
GET  /api/square/sales?from=&to=&granularity=day|week|month
PUT  /api/square/products/:itemId
POST /api/square/products/:itemId/image
POST /api/square/products/:itemId/inventory
POST /api/square/inventory/batch
POST /api/admin/inventory-export/run   # manual trigger for the monthly xlsx export
```

Add a listing via curl:

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

---

## Product Catalog Data Model

Stored in Redis as `outpost:products`:

```
ProductType  (e.g., "Magic: The Gathering", "Pokémon")
  └── ProductSet  (e.g., "Tarkir: Dragonstorm", "Scarlet & Violet")
       └── SetProduct  (e.g., "Booster Box", "Elite Trainer Box")
            - name, description, price, imageUrl, isVisible, sortOrder
```

Each level has `isVisible` — toggling this hides items from the public site without deleting them. Use this for out-of-stock products instead of deleting.

Seeded on first run with all current Magic sets (see `api/server.js` `DEFAULT_CATALOG`).

---

## Square POS Catalog Admin

A separate system from the manual product catalog above — this talks directly to the shop's real Square point-of-sale account (catalog + inventory + sales), not the site's own Redis-backed `outpost:products` tree. Admin editing happens via the four `/x/outpostAdmin/square-*` routes in the table above — each groups its item list into collapsible sections by top-level Square category for faster navigation on a large catalog — but the integration isn't wired into any public page yet.

**Sandbox vs. production**: every Square call is routed by `SQUARE_ENV` (`sandbox` or `production`) through `api/squarePosClient.js`'s `resolveSquareCredentials()`, which picks the matching pair of access token / application ID / location ID env vars below. Always test destructive changes against `SQUARE_ENV=sandbox` first.

**What the item-level fields actually do** (confirmed against a live Square account, not just docs):
- `track_inventory` — whether Square keeps an on-hand count for a variation at all. Off means "always in stock, no count."
- `sellable` — whether the variation can be rung up at the register. Used to mark draft/not-yet-released items (see WotC import script below) as visible-but-unpurchasable.
- `ecom_visibility` — **has no effect on this website or the physical POS.** It only controls visibility on Square's own optional online store, which this shop doesn't use. Safe to leave alone.

**Unit cost / profit tracking**: Square's Catalog API has no built-in "cost of goods" field (confirmed live — nothing on `item_variation_data`). A `CatalogCustomAttributeDefinition` named "Unit Cost" (type `NUMBER`, scoped to `ITEM_VARIATION`, key `outpost_unit_cost`) was created once via a direct API call to fill that gap — it now shows up automatically in Square's own dashboard/reports too, not just here. It's edited per-variation in the Square Catalog Editor next to Price, and read/written in `api/squarePosClient.js` via `readCostCents()`/`buildCostAttributeValues()`. Square resolves the definition from its `key` alone on writes — no definition id needs to be stored or looked up anywhere in this codebase. Leaving it blank is a real, honest "unknown," never assumed to be $0 — the sales dashboard's profit figures reflect only products with a cost actually entered, and call out how many that is so the numbers are never silently misleading.

**Categories vs. reporting category**: an item's `categories` (array) and `reporting_category` (single value) are independent fields on Square's side — the Dashboard, POS, and reports all read `reporting_category` as *the* category, but it doesn't follow `categories` automatically. `updateSquareCatalogItem()` keeps both in sync on every category change; if you're debugging a category edit that "didn't stick," check whether these two have drifted apart on the raw catalog object.

**Monthly inventory export**: on the 1st of each month (store-local time), `api/inventoryExport.js` builds an `.xlsx` snapshot of the Square inventory report — non-snack items, sorted by stock status → category → quantity (lowest stock first, to surface aging stock) — and emails it via Gmail SMTP (`api/mailClient.js`) to `theoutpostgamingrgv@gmail.com`. Requires `GMAIL_USER`/`GMAIL_APP_PASSWORD` (see Environment Variables); idle with a log warning until set. Manual trigger for testing: `POST /api/admin/inventory-export/run` (admin auth).

**Uploading a product image**: Square's `CreateCatalogImage` endpoint *appends* the new image to `item_data.image_ids` rather than replacing or prepending it (confirmed live) — but every read path here treats `image_ids[0]` as "the" image. `uploadSquareCatalogImage()` does a follow-up write to move the new image to the front of that array; without it, a freshly uploaded image would never actually display anywhere (admin, or a future public page) even though the upload itself "succeeded."

### Maintenance scripts (`api/scripts/`)

All follow the same convention: **preview by default, `--apply` to actually write.** Run from `api/`.

| Script | Command | Purpose |
|---|---|---|
| Sandbox sync | `npm run sync:sandbox -- --apply [--with-inventory]` | Wipes and recreates the sandbox catalog from a snapshot of production, for safe testing. `--with-inventory` also copies production on-hand counts into sandbox (otherwise every synced item starts at 0) — use it to validate inventory-display changes against realistic numbers before running scripts/routes against production |
| WotC SKU cross-reference | `npm run wotc:cross-reference -- <file.xlsx> [--create-drafts [--sellable]] [--update-existing] [--category "<Name>"]` | Cross-references a WPN/WotC set SKU sheet against the Square catalog: reports exact/possible matches and anything new; `--create-drafts` creates missing items as hidden, non-sellable drafts (add `--sellable` for a set that's already available to sell in-store, so new items go live instead); `--update-existing` corrects matched items' title/description/category to the sheet's official values |
| Reset negative inventory | `npm run inventory:reset-negative [-- --apply]` | Finds every variation with a negative on-hand count and sets it to 0 |

Drop downloaded WotC set xlsx files into `api/data/wotc-imports/` (gitignored) before running the cross-reference script — that folder exists specifically so these working files don't get committed.

---

## Squarespace Integration (Legacy)

A read-only product source backed by the shop's Squarespace store, built before the Square POS integration above and now superseded by it — `api/server.js` itself marks these routes as "left in place only as documentation" and safe to remove once Square is fully validated. It never touched the manual `outpost:products` catalog and isn't wired into any public page.

- `api/squarespaceClient.js` — HTTP layer (products = API `v2`, inventory = API `1.0`); auth via `SQUARESPACE_API_KEY` or OAuth.
- `api/squarespaceCache.js` — merges inventory into products by `variantId → sku`, Redis-cached with a TTL-based background refresh (default 15 min).
- `api/squarespaceOAuth.js` — OAuth 2.0 flow for plans without a Developer API Key; only needed if `SQUARESPACE_API_KEY` isn't set.

| Route | Purpose |
|---|---|
| `GET /api/squarespace/products` | Merged catalog with each product's `assignment` |
| `POST /api/squarespace/refresh` | Force sync |
| `GET /api/squarespace/status` | Cache + OAuth status |
| `PUT /api/squarespace/products/:productId/assignment` | Tag a product with `{ typeId, setId }` into the manual catalog |
| `GET /api/squarespace/oauth/authorize` / `/oauth/callback` | One-time OAuth consent flow |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in values:

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Frontend API base path | `/api` |
| `VITE_PRODUCTS_PAGE_LIVE` | Build-time flag — show the live Square-backed `/products` page instead of "Coming Soon" | `false` |
| `REDIS_URL` | Redis connection string | `redis://redis:6379` |
| `PORT` | API server port | `3001` |
| `NODE_ENV` | Environment | `production` |
| `SQUARE_ENV` | Which Square credential pair to use: `sandbox` or `production` | `sandbox` |
| `SQUARE_ACCESS_TOKEN` | Production Square access token | — |
| `SQUARE_APPLICATION_ID` | Production Square application ID | — |
| `SQUARE_LOCATION_ID` | Production Square location ID | — |
| `SQUARE_SANDBOX_ACCESS_TOKEN` | Sandbox Square access token | — |
| `SQUARE_SANDBOX_APPLICATION_ID` | Sandbox Square application ID | — |
| `SQUARE_SANDBOX_LOCATION_ID` | Sandbox Square location ID (falls back to `SQUARE_LOCATION_ID` if unset) | — |
| `ADMIN_USERS` | JSON array of `{ username, passwordHash }` for admin login (bcrypt hashes) | — |
| `GMAIL_USER` | Gmail account sending the monthly inventory export (requires 2FA + an App Password); export idle if unset | — |
| `GMAIL_APP_PASSWORD` | App Password for `GMAIL_USER` (Google Account > Security > App Passwords) | — |
| `MAIL_TO` | Destination address for the monthly inventory export | `theoutpostgamingrgv@gmail.com` |
| `MARKETING_POSTERS_DIR` | Where the API reads homepage carousel posters from; only needed if the default repo-root-relative path doesn't apply | `<repo>/public/wpn-assets/posters` |
| `SQUARESPACE_API_KEY` | Read-only Squarespace key (legacy integration); idle if unset | — |
| `SQUARESPACE_USER_AGENT` | Descriptive User-Agent for Commerce API calls | `TheOutpostGames-Website/1.0` |
| `SQUARESPACE_CACHE_TTL_MS` | Cache TTL before background refresh | `900000` (15 min) |
| `SQUARESPACE_CLIENT_ID` / `SQUARESPACE_CLIENT_SECRET` / `SQUARESPACE_REDIRECT_URI` | OAuth credentials (only needed without `SQUARESPACE_API_KEY`) | — |

For production on Upstash, use a `rediss://` URL (TLS is auto-detected from `upstash.io` in the hostname).

---

## Deployment

The app runs as a single combined container on Fly.io: Nginx serves the Vue SPA, proxies `/api` to a Node.js process in the same container.

```bash
# Deploy to Fly.io
flyctl deploy

# Purge Cloudflare cache after deploy
./scripts/purge-cloudflare.sh
```

See `docs/deployment/` for full deployment guides.

---

## Marketing Assets (`/wpn-assets/posters/`)

The homepage carousel is **fully filesystem-driven** — drop an image into `public/wpn-assets/posters/` and it appears automatically, no admin step required. `GET /api/marketing-posters` (`api/marketingPosters.js`) lists whatever's in that folder and titles each slide from its filename (e.g. `tmnt.jpg` → "Tmnt"); removing a file removes its slide. This replaced the old admin-managed Featured Items CRUD, which existed solely to power this carousel.

This is for **promotional/marketing posters**, not product photography — phase one of the product page rollout uses Square's own hosted product photos instead, so the manual product catalog's `imageUrl` fields are left blank until that's wired up. See `WPN_ASSET_ACCESS_GUIDE.md` for where to source official WPN marketing materials. Once the shop carries a wider selection of stock, set-based product imagery may return under a separate convention.

**Deployment note**: the API reads this folder directly off disk (not proxied through nginx), and its path resolution differs by environment — see `MARKETING_POSTERS_DIR` in Environment Variables and the comments in `Dockerfile.combined`/`local-dev/docker-compose.yml` if adding a new deployment target.
