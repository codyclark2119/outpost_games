# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**The Outpost Games** website — a TCG card shop in Rio Grande City, TX. Covers Magic: The Gathering, Pokémon, One Piece, and other games. Live at https://outpostgamesrgv.com.

## Commands

### Frontend (root)
```bash
npm run dev           # Vite dev server on :5173 (proxies /api → :3001)
npm run dev:all        # Vite + api dev server together (via concurrently)
npm run build         # Type-check then Vite build
npm run type-check    # vue-tsc --noEmit
npm run lint          # ESLint
npm run lint:fix      # ESLint auto-fix
npm run format        # Prettier write
npm run format:check  # Prettier check
npm run pre-deploy    # format:check + lint + type-check (run before deploying)
npm run clean          # Remove dist/
```

### API backend (`api/`)
```bash
cd api && npm run dev   # node --watch server.js on :3001
cd api && npm start     # production
cd api && npm test       # node --test tests/*.test.js
```

### Docker (local full-stack)
```bash
npm run docker:setup       # First-time setup
npm run docker:up          # Start existing containers
npm run docker:rebuild     # Rebuild ALL images, then start (use after any code change)
npm run docker:rebuild:web # Rebuild the frontend image only (faster — skips API/Redis)
npm run docker:restart     # Restart running containers
npm run docker:down        # Stop
npm run docker:logs        # Tail logs
```

## Architecture

### Two-service structure
- **Frontend**: Vue 3 + TypeScript + Vite SPA (root of repo)
- **API**: Node.js/Express at `api/server.js` — no TypeScript

### Frontend stack
- **Vue 3** with `<script setup>` composition API throughout
- **Vue Router 4** — routes defined in `src/main.ts`, all views lazy-loaded except `Home`
- **Pinia** stores in `src/stores/` (composition API style with `ref`/`computed`)
- **Tailwind CSS v4** — custom brand colors defined in `src/style.css` under `@theme`: `outpost-gold`, `outpost-navy`, etc. Component classes like `card-mtg`, `btn-primary`, `btn-secondary` are in the `@layer components` block
- **Heroicons** + **Headless UI** for UI elements; **Lucide Vue** also used in some places

### Scoped `<style>` in components
Tailwind v4 does **not** support `@apply` with custom theme tokens in scoped component styles. Use plain CSS properties instead, or `@reference "tailwindcss"` for standard utilities only. Custom colors (`outpost-navy`, etc.) must be written as hex values in scoped styles.

### API (`api/server.js`)
Express server with Redis for persistence, falls back to module-level in-memory variables if Redis is unreachable. Three resource types:
- `outpost:events` — CRUD for special tournament events
- `outpost:tcgplayer:listings` — manually managed TCGPlayer card listings (seller ID `61af7a3a`)
- `outpost:products` — hierarchical product catalog (Types → Sets → Products)

Frontend reads `VITE_API_URL` (defaults to `/api`). In dev, Vite proxies `/api` → `http://localhost:3001`.

### Pinia stores
- `src/stores/events.ts` — `SpecialEvent` interface (id, title, date, time, entry, description, gameTypeId?, gameTypeName?)
- `src/stores/products.ts` — `ProductType → ProductSet → SetProduct` hierarchy with full CRUD
- `src/stores/featuredItems.ts` — homepage promoted-item carousel CRUD (`visibleSorted` computed feeds `Home.vue` directly)
- `src/stores/cart.ts` — cart state (reserved for future e-commerce, not wired to checkout)
- `src/stores/auth.ts` — admin session state

### Public routes
The public site is a single page (`Home.vue`) plus two standalone routes. `/about` and `/contact` are redirects to in-page anchors (`/#about`, `/#contact`), not separate views.
| Path | View |
|---|---|
| `/` | `Home.vue` — one-page site: hero, featured items carousel, multi-TCG showcase, weekly events, about, Discord/Instagram social CTA, contact |
| `/products` | `Products.vue` (carousel per game type, "View All" links) |
| `/products/:typeId` | `ProductsGameType.vue` (flat product list + filter/sort, reads `?set=` query param) |
| `/events` | `Events.vue` |
| `/terms` | `Terms.vue` |
| `/privacy` | `Privacy.vue` |

### Admin routes (hidden — access via `/x/outpostAdmin`)
| Path | View | Purpose |
|---|---|---|
| `/x/outpostAdmin` | `AdminDashboard.vue` | Dashboard with links to every section |
| `/x/outpostAdmin/events` | `AdminEvents.vue` | Manage events (list + edit modal) |
| `/x/outpostAdmin/events/add` | `AdminEventsAdd.vue` | Add event form |
| `/x/outpostAdmin/featured-items` | `AdminFeaturedItems.vue` | Manage homepage promoted-item carousel |
| `/x/outpostAdmin/featured-items/add` | `AdminFeaturedItemsAdd.vue` | Add a featured item |
| `/x/outpostAdmin/products` | `AdminProducts.vue` | Hierarchical tree with visibility toggles |
| `/x/outpostAdmin/products/add` | `AdminProductsAdd.vue` | Add game type / set / product |
| `/x/outpostAdmin/tcgplayer` | `AdminTCGPlayerPage.vue` | Manage card listings |
| `/x/outpostAdmin/tcgplayer/add` | `AdminTCGPlayerAdd.vue` | Add card listing |
| `/x/outpostAdmin/square-catalog` | `AdminSquareCatalog.vue` | Edit Square items/variations/categories/images |
| `/x/outpostAdmin/square-stock` | `AdminSquareStock.vue` | Read-only Square inventory report, CSV export |
| `/x/outpostAdmin/square-sales` | `AdminSquareSales.vue` | Revenue/order/AOV trend charts, top-products table |
| `/x/outpostAdmin/square-mass-inventory` | `AdminSquareMassInventory.vue` | Bulk on-hand count corrections |

All admin chunks are code-split into a separate `admin` bundle via `vite.config.ts`.

### Product catalog data model (Redis key: `outpost:products`)
```
ProductType   (id, name, isVisible, sortOrder)
  └── ProductSet   (id, name, imageUrl, isVisible, sortOrder)
       └── SetProduct   (id, name, description, price, imageUrl, isVisible, sortOrder)
```
Public pages only render items where `isVisible === true`. Use the visibility toggle to hide out-of-stock products — don't delete them.

Seeded on first run via `DEFAULT_CATALOG` in `api/server.js` (includes all current Magic sets + Pokémon, One Piece, Other as empty types).

### `/products/:typeId?set=<setId>` deep links
`ProductsGameType.vue` watches `route.query.set` with `immediate: true` and pre-populates the set filter checkbox. Set cards on `Products.vue` link directly to `?set=<setId>`. Featured slides on `Home.vue` use the same pattern in their `linkTo` field.

### Square POS integration

A separate system from the manual `outpost:products` catalog above — talks directly to the shop's live Square point-of-sale account (catalog, inventory, sales), not Redis. Admin editing happens via the four `/x/outpostAdmin/square-*` routes above; not wired into any public page yet.

- `api/squarePosClient.js` — Catalog + Inventory API client. Every credential lookup goes through `resolveSquareCredentials(env)`, which picks production vs. sandbox creds based on `SQUARE_ENV`. Key exports: `listSquareCatalogItems`/`getSquareInventoryReport` (catalog + on-hand counts merged), `getSquareCatalogItem`/`updateSquareCatalogItem` (item editing — see the `reporting_category` note below), `listSquareCategories`/`resolveTopLevelCategoryMap` (category tree + collapse-to-top-level for grouping), `uploadSquareCatalogImage`, `adjustSquareInventoryCount(Batch)`.
- `api/squareOrdersClient.js` — Orders API client for the Sales dashboard: revenue/order/AOV trends, category + payment-method + day-of-week/hour-of-day breakdowns (store-local `America/Chicago` time), and per-product profit (via a `outpost_unit_cost` custom attribute on `ITEM_VARIATION` — Square has no native cost-of-goods field).
- **`categories` vs. `reporting_category`**: an ITEM's `item_data.categories` (array) and `item_data.reporting_category` (single value) are independent fields — Square's Dashboard/POS/reports read `reporting_category` as *the* category, but it doesn't follow `categories` automatically. `updateSquareCatalogItem` keeps both in sync on every category change; if a category edit ever looks like it "didn't save," check whether these two have drifted apart on the raw catalog object.
- `api/inventoryExport.js` + `api/mailClient.js` — monthly `.xlsx` inventory export (non-snack items, sorted by stock status → category → quantity), emailed via Gmail SMTP to `theoutpostgamingrgv@gmail.com` on the 1st of the month (store-local time). Scheduler runs hourly and no-ops until `GMAIL_USER`/`GMAIL_APP_PASSWORD` are set. Manual trigger: `POST /api/admin/inventory-export/run` (admin auth).

### Squarespace integration (legacy — superseded by the Square POS integration above, read-only, additive, separate from manual catalog)

A parallel, read-only product source backed by the shop's Squarespace store. It does **not** replace or touch the manual `outpost:products` catalog above — wiring the UI to it is intentionally deferred. Logic is split into three modules:

- `api/squarespaceClient.js` — HTTP layer. Native `fetch`/`AbortController` (no deps). Paginated GETs (loop on `cursor` until `hasNextPage` is false, 200-page safety cap), 10s timeout, retry+backoff on 429/502/503/504 only, 401 surfaced as `SquarespaceNotAuthorizedError`. Exports `listAllProducts()`, `listAllInventory()`, `isConfigured()`. Note the different version prefixes: Products = `v2`, Inventory = `1.0`. Auth is sourced from `SQUARESPACE_API_KEY` if set, else a live OAuth access token from `squarespaceOAuth.js`.
- `api/squarespaceCache.js` — orchestration/cache/merge (Redis-with-memory-fallback like `getCatalog`/`saveCatalog`, via `initSquarespaceCache({ redisClient, isRedisConnected })` from server.js). Merges inventory into products by `variantId`→`sku` (InventoryItem has no productId). Computes per-product `inStock`/`visible` (`isVisible && in-stock`, DIGITAL always in stock) + `totalQuantity`. Redis keys `outpost:squarespace:cache` and `outpost:squarespace:assignments`. TTL-based background refresh (default 15 min). On startup it refreshes once **only if configured** (either auth option below) — otherwise it logs one warning and stays idle.
- `api/squarespaceOAuth.js` — OAuth 2.0 authorization-code flow, only needed on plans without Developer API Keys (`SQUARESPACE_API_KEY`). Scope is read-only: `website.products.read,website.inventory.read`. Redis key `outpost:squarespace:oauth:tokens` (access token ~30min, refresh token ~7 days and **rotates on every use** — both must be persisted on every refresh). `getValidAccessToken()` auto-refreshes ~10s before expiry; throws `SquarespaceNotAuthorizedError` if the one-time human step hasn't happened yet or the refresh token died.

Grouping is manual: `PUT /api/squarespace/products/:productId/assignment` tags a product with a `typeId`/`setId` into the manual catalog (validated against `getCatalog()`); no auto-derivation from tags/storePageId.

**One-time setup once OAuth credentials arrive** (skip if using `SQUARESPACE_API_KEY` instead): set `SQUARESPACE_CLIENT_ID`/`SQUARESPACE_CLIENT_SECRET`/`SQUARESPACE_REDIRECT_URI`, deploy, then visit `/api/squarespace/oauth/authorize` once in a browser to grant access.

| Route | Purpose |
|---|---|
| `GET /api/squarespace/products` | `{ fetchedAt, products }` merged catalog, each with its `assignment` |
| `POST /api/squarespace/refresh` | Force sync; 503 if unconfigured/unauthorized, 502 on upstream failure |
| `GET /api/squarespace/status` | Cache status + `oauth: { configured, authorized, accessTokenExpiresAt, refreshTokenExpiresAt }` |
| `PUT /api/squarespace/products/:productId/assignment` | Body `{ typeId, setId }` (null to unassign) |
| `GET /api/squarespace/oauth/authorize` | Redirects to Squarespace's consent screen (one-time human step) |
| `GET /api/squarespace/oauth/callback` | OAuth redirect_uri — exchanges the one-time code for tokens |

### Events game type association
`SpecialEvent` stores `gameTypeId` and `gameTypeName` (replaces the old `setId` field which was never persisted). Admin forms populate the game type dropdown from the live products catalog types, with a "Custom…" option for one-off events.

### Home page
- Hero section with side banner carousels
- Featured event banner (next API special event, or next weekly recurring event as fallback)
- Featured/promoted items carousel — admin-managed via `featuredItems` store/`AdminFeaturedItems.vue`, not a hardcoded array
- Multi-TCG showcase (`home-sections/MultiTcgShowcase.vue`, async-loaded)
- Weekly events section
- About section (`id="about"`)
- Discord + Instagram social CTA (`home-sections/SocialCtaSection.vue`, async-loaded)
- Contact section (`id="contact"`)

In-page navigation (`About`/`Contact` links, cross-route anchors) is handled by `src/composables/useSectionNav.ts`.

### Deployment
- **Fly.io** (`fly.toml`) — combined `Dockerfile.combined` serves both the Vue SPA (Nginx) and API (Node.js) from one container
- **Redis**: Upstash (TLS via `rediss://` URL, auto-detected from `upstash.io` in hostname)
- `docker-compose.prod.yml` for self-hosted production

## Environment Variables
| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Frontend API base | `/api` |
| `REDIS_URL` | Redis connection (supports `rediss://` for TLS) | `redis://redis:6379` |
| `PORT` | API port | `3001` |
| `SQUARESPACE_API_KEY` | Read-only Squarespace key (scopes `products:read`, `inventory:read`); integration idle if unset | — |
| `SQUARESPACE_USER_AGENT` | Descriptive User-Agent for Commerce API calls | `TheOutpostGames-Website/1.0` |
| `SQUARESPACE_CACHE_TTL_MS` | Cache TTL before background refresh | `900000` (15 min) |
| `GMAIL_USER` | Gmail account sending the monthly inventory export (requires 2FA + an App Password); export job idle if unset | — |
| `GMAIL_APP_PASSWORD` | App Password for `GMAIL_USER` (Google Account > Security > App Passwords) | — |
| `MAIL_TO` | Destination address for the monthly inventory export | `theoutpostgamingrgv@gmail.com` |
