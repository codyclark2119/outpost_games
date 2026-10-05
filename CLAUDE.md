# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**The Outpost Games** website — a TCG card shop in Rio Grande City, TX. Covers Magic: The Gathering, Pokémon, One Piece, and other games. Live at https://outpostgamesrgv.com.

## Commands

### Frontend (root)

```bash
npm run dev           # Vite dev server on :5173 (proxies /api → :3001, except module imports like /api/storeConfig.json?import)
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
- **Tailwind CSS v4** — brand colors and fonts are defined in `src/style.css` under `@theme`: `outpost-gold`, `outpost-navy`, `outpost-paper` (page surface), per-game `game-*` accents, `font-sans` (Inter, all UI/body text) and `font-display` (Cinzel, headings only — echoes the logo's wordmark). Theme fonts must use the `--font-*` namespace; the old `--font-family-*` names generated nothing. Shared component classes live in the `@layer components` block: `page-shell` (page width + gutters), `btn-primary`, `btn-secondary`, `btn-on-dark` (secondary action on navy), `card`, `chip`/`chip-active`, `eyebrow`, `section-title`, `text-link`, `form-input`, `scroll-row` (swipeable row that bleeds to the screen edge on phones)
- **Mobile-first public layout** — `PublicLayout.vue` = sticky `AppHeader` (logo, live open/closed status, desktop nav) + `AppFooter` + `MobileTabBar` (fixed bottom tab bar below `md`). Header and tab bar both render `PRIMARY_NAV` from `src/config/navigation.ts`. The footer pads its bottom by the tab bar's height; anything new fixed to the bottom of a public page has to account for that bar
- **Critical CSS in `index.html` is unlayered**, so it outranks every Tailwind layer regardless of specificity — keep it to the body background and `#app` height. (A `border-width: 0` reset there once silently erased every border on the site.) The page surface is painted by each layout's root element, not `<body>`, which stays navy so iOS overscroll matches the header and footer
- **Heroicons** + **Headless UI** for UI elements; **Lucide Vue** also used in some places

### Scoped `<style>` in components

Tailwind v4 does **not** support `@apply` with custom theme tokens in scoped component styles. Use plain CSS properties instead, or `@reference "tailwindcss"` for standard utilities only. Custom colors (`outpost-navy`, etc.) must be written as hex values in scoped styles.

### API (`api/server.js`)

Express server with Redis for persistence, falls back to module-level in-memory variables if Redis is unreachable. Resource types:

- `outpost:events` — CRUD for special tournament events
- `outpost:tcgplayer:listings` — manually managed TCGPlayer card listings (seller ID `61af7a3a`)
- `outpost:weeklyOverrides` — per-date hide overrides for recurring weekly events (see below)

Frontend reads `VITE_API_URL` (defaults to `/api`). In dev, Vite proxies `/api` → `http://localhost:3001`.

### Pinia stores

- `src/stores/events.ts` — `SpecialEvent` interface (id, title, date, time, entry, description, gameTypeId?, gameTypeName?, isVisible?). Note `upcomingEvents` is the **raw** API list despite the name — nothing in the store drops events whose date has passed, so every consumer filters for itself (`Events.vue`, `Home.vue`, and both admin list views each do their own date check). Anything new that renders events publicly must do the same or it will advertise finished tournaments.
- `src/stores/weeklyOverrides.ts` — per-date hide overrides for `WEEKLY_SCHEDULE` entries
- `src/stores/squareCatalog.ts` — live Square inventory for the public `/products` page (the shop's only product catalog — see "Square POS integration" below). Views call `ensureCatalog()` on mount, not `fetchCatalog()`: it reuses an in-memory copy younger than 5 minutes and re-requests otherwise. Freshness is tracked with its own client-side `loadedAt`, not the `fetchedAt` in the response — that one reports when the *API* last polled Square and can already be an hour old on arrival. `sections` groups items by top-level category (one per game); each section's `sets` are keyed by the slug of the set *name*, not the Square category id, because Square allows duplicate-named categories (e.g. "Foundations" vs "Foundations ") and a shopper should see one chip for both. Also exports `newest` (Home's New arrivals), `matchesSearch`, `formatPrice`, `releaseMs`.
- `src/config/games.ts` — display names and accent colors per game slug (`gameMeta(slug, squareName)`). Cosmetic only: a category missing here still appears everywhere under its Square name.
- `src/config/setSymbols.ts` — stand-in art for products with no Square photo: the set's symbol from `src/assets/set-symbols/<set-slug>.webp` (matched by the item's set name, or by the set appearing in the product name), else the shop badge. Covering a new set is just dropping its symbol file in there. Prices of $0/none render as "Ask in store" (`formatPrice`).
- `src/stores/cart.ts` — cart state (reserved for future e-commerce, not wired to checkout)
- `src/stores/auth.ts` — admin session state

### Public routes

The public site is a single page (`Home.vue`) plus two standalone routes. `/about` and `/contact` are redirects to in-page anchors (`/#about`, `/#contact`), not separate views.
| Path | View |
|---|---|
| `/` | `Home.vue` — one-page site: hero (live open/closed status, shop/events/directions), this week's events, shop by game, new arrivals, about (`#about`), community/socials, visit + hours (`#contact`) |
| `/products` | `Products.vue` — sticky game chips (`GameNav`), cross-game search (`?q=`), one swipeable preview row per game with "View all" |
| `/products/:typeId` | `ProductsGameType.vue` — one game: search, sort, set chips; filters mirrored to `?q=`, `?sort=`, `?set=`. `/products/bandai` redirects to `/products` (see Bandai note below) |
| `/events` | `Events.vue` |
| `/terms` | `Terms.vue` |
| `/privacy` | `Privacy.vue` |

### Admin routes (hidden — base path configurable via `VITE_ADMIN_BASE_PATH`, defaults to `/x/outpostAdmin`)

Every route below is built from `ADMIN_BASE_PATH` (`src/config/adminPath.ts`) in `src/main.ts`, and every internal link/redirect to an admin route uses Vue Router's named-route navigation (`:to="{ name: '...' }"`, never a hardcoded path string) — so changing the env var is the only step needed to move the whole section to a different path. Paths below show the default.
| Path | View | Purpose |
|---|---|---|
| `/x/outpostAdmin` | `AdminDashboard.vue` | Dashboard with links to every section |
| `/x/outpostAdmin/events` | `AdminEvents.vue` | Manage events (list + edit modal) |
| `/x/outpostAdmin/events/add` | `AdminEventsAdd.vue` | Add event form |
| `/x/outpostAdmin/weekly-schedule` | `AdminWeeklySchedule.vue` | Hide one occurrence of a recurring weekly event for a specific date |
| `/x/outpostAdmin/tcgplayer` | `AdminTCGPlayerPage.vue` | Manage card listings |
| `/x/outpostAdmin/tcgplayer/add` | `AdminTCGPlayerAdd.vue` | Add card listing |
| `/x/outpostAdmin/square-catalog` | `AdminSquareCatalog.vue` | Edit Square items/variations/categories/images |
| `/x/outpostAdmin/square-stock` | `AdminSquareStock.vue` | Read-only Square inventory report, CSV export |
| `/x/outpostAdmin/square-sales` | `AdminSquareSales.vue` | Revenue/order/AOV trend charts, top-products table |
| `/x/outpostAdmin/square-mass-inventory` | `AdminSquareMassInventory.vue` | Bulk on-hand count corrections, "Start from zero" full recount, scan-to-count |
| `/x/outpostAdmin/scan` | `AdminSquareScan.vue` | Phone barcode scanner: look up a product, set its count, or link an unknown barcode to it |
| `/x/outpostAdmin/square-restock` | `AdminSquareRestock.vue` | Persisted box→packs restock pairs, one-click apply |

All admin chunks are code-split into a separate `admin` bundle via `vite.config.ts`.

### `/products/:typeId` filter deep links

`ProductsGameType.vue` seeds its filters (`?q=`, `?sort=`, `?set=`) from the URL once during setup, then mirrors them back with `router.replace` — query→state on entry, state→query afterwards, so the current view is shareable and refreshable. `?set=` holds a set slug; an older link carrying a raw Square category id still resolves, since each set keeps the ids it covers. Switching games via `GameNav` reuses the component, so a `typeId` watcher resets the filters.

### Square POS integration

Talks directly to the shop's live Square point-of-sale account (catalog, inventory, sales), not Redis — this is the shop's only product catalog now (the old manually-managed Redis catalog was retired once Square management proved more intuitive for day-to-day use). Admin editing happens via the `/x/outpostAdmin/square-*` routes and `/x/outpostAdmin/scan` above.

- `api/squarePosClient.js` — Catalog + Inventory API client. Every credential lookup goes through `resolveSquareCredentials(env)`, which picks production vs. sandbox creds based on `SQUARE_ENV`. Key exports: `listSquareCatalogItems`/`getSquareInventoryReport` (catalog + on-hand counts merged), `getSquareCatalogItem`/`updateSquareCatalogItem` (item editing — see the `reporting_category` note below), `listSquareCategories`/`resolveTopLevelCategoryMap` (category tree + collapse-to-top-level for grouping), `getPublicSquareCatalog` (public-facing subset — excludes snack/food, accessories, and tournament-entry categories via `PUBLIC_CATALOG_EXCLUDED_CATEGORIES`, and hides singles: anything filed under a "Single(s)" category plus catch-all items named "… singles" — plural-only, so sealed "Single Booster Pack" products stay), `uploadSquareCatalogImage`, `adjustSquareInventoryCount(Batch)`.
- `api/squareOrdersClient.js` — Orders API client for the Sales dashboard: revenue/order/AOV trends, category + payment-method + day-of-week/hour-of-day breakdowns (store-local `America/Chicago` time), and per-product profit (via a `outpost_unit_cost` custom attribute on `ITEM_VARIATION` — Square has no native cost-of-goods field).
- **`categories` vs. `reporting_category`**: an ITEM's `item_data.categories` (array) and `item_data.reporting_category` (single value) are independent fields — Square's Dashboard/POS/reports read `reporting_category` as _the_ category, but it doesn't follow `categories` automatically. `updateSquareCatalogItem` keeps both in sync on every category change; if a category edit ever looks like it "didn't save," check whether these two have drifted apart on the raw catalog object.
- **Image upload ordering**: Square's `CreateCatalogImage` appends to the target's `image_ids` rather than replacing/prepending it (confirmed live), but every read path treats `image_ids[0]` as "the" image. `uploadSquareCatalogImage` does a follow-up write to move the new image to the front — without it, a freshly uploaded image silently never displays.
- **Per-variation images**: `uploadSquareCatalogImage(objectId, ...)` accepts either an ITEM id (sets the shared group photo, `item_data.image_ids`) or an ITEM_VARIATION id (sets that one variation's own photo, `item_variation_data.image_ids`) — confirmed against Square's docs that `CreateCatalogImage` treats both the same way. `listSquareCatalogItems`/`getSquareCatalogItem` resolve each variation's own image first, falling back to the item's group photo when the variation has none of its own (`hasOwnImage` flag). Admin route: `POST /api/square/products/:itemId/variations/:variationId/image`.
- `api/inventoryExport.js` + `api/mailClient.js` — monthly `.xlsx` inventory export (non-snack items, sorted by stock status → category → quantity), emailed via Gmail SMTP to `theoutpostgamingrgv@gmail.com` on the 1st of the month (store-local time). Scheduler runs hourly and no-ops until `GMAIL_USER`/`GMAIL_APP_PASSWORD` are set. Manual trigger: `POST /api/admin/inventory-export/run` (admin auth).
- **Barcodes**: a variation's `sku` holds the shop's own code (what the register matches; locked in the catalog editor) and `upc` holds the manufacturer barcode ("GTIN" in Square's Dashboard, 12–14 digits). Lookups match either field, treating UPC-A and its EAN-13 spelling (leading `0`) as the same code — `barcodeVariants` in `api/squarePosClient.js`, mirrored by `src/utils/barcode.ts` (keep the two in sync). `linkSquareVariationBarcode` (`POST /api/square/variations/:variationId/barcode`) fills an empty SKU, else adds a GTIN, never overwrites a SKU, and refuses a code another variation already uses. Camera scanning is `useBarcodeScanner.ts` + `BarcodeScanner.vue`: the native `BarcodeDetector` where it reads EAN-13 and Code 128, else the lazily-loaded `zxing-wasm` ponyfill with its `.wasm` served from this site (keeps the CSP `'self'`-only). The same component's text box takes typed codes and USB/Bluetooth scanners.
- **Inventory counts are read as `IN_STOCK` only**: `listSquareInventory` passes `states: ['IN_STOCK']`. Without it Square also returns a variation's `RETURNED_BY_CUSTOMER`/`WASTE` counts as separate rows, and every caller keys counts by variation id alone — so a stale returns count silently became "the" on-hand quantity.
- **One top-level category per game**: the public catalog groups by top-level Square category, so every game must be its own root category. Bandai was formerly a publisher umbrella over One Piece, Gundam, Digimon, and Union Arena; those were promoted to top level on 2026-10-05 and the Bandai category left empty. Put a new game at the root, never under a publisher.
- **Public product page** (`/products`, `/products/:typeId`): `api/squarePublicCatalogCache.js` (store-hours-aware TTL cache, Redis-backed like the Squarespace cache below) wraps `getPublicSquareCatalog` and exposes `GET /api/square/public-catalog`. Sections lead with `PINNED_CATEGORY_ORDER` (Magic, Pokémon, One Piece, Gundam, Riftbound), then everything else by stock on hand; category names are compared trimmed and case-insensitively. `src/stores/squareCatalog.ts` consumes it; `Products.vue`/`ProductsGameType.vue` render straight from Square inventory. Gated behind `VITE_PRODUCTS_PAGE_LIVE` (see Environment Variables) — flip that to `true` and rebuild once ready to go public; until then both views show `ComingSoonPanel`.
  - **Cache invalidation on admin writes**: every `/api/square/*` admin mutation (image upload, product update, delete, inventory adjust) calls `invalidatePublicCatalog()` (a small wrapper around `refreshSquarePublicCatalog()`) right after it succeeds. Without this, an edit only reaches the public page once the store-hours TTL next expires (up to an hour open, a day closed) — which reads as "the save didn't work" from the admin's perspective even though Square itself updated fine. Adding a new admin mutation route that changes catalog data should call this too.

### Squarespace integration (legacy — superseded by the Square POS integration above, read-only, additive)

A parallel, read-only product source backed by the shop's Squarespace store — wiring the UI to it is intentionally deferred. Logic is split into three modules:

- `api/squarespaceClient.js` — HTTP layer. Native `fetch`/`AbortController` (no deps). Paginated GETs (loop on `cursor` until `hasNextPage` is false, 200-page safety cap), 10s timeout, retry+backoff on 429/502/503/504 only, 401 surfaced as `SquarespaceNotAuthorizedError`. Exports `listAllProducts()`, `listAllInventory()`, `isConfigured()`. Note the different version prefixes: Products = `v2`, Inventory = `1.0`. Auth is sourced from `SQUARESPACE_API_KEY` if set, else a live OAuth access token from `squarespaceOAuth.js`.
- `api/squarespaceCache.js` — orchestration/cache/merge (Redis-with-memory-fallback, same convention as every other resource in `api/server.js`, via `initSquarespaceCache({ redisClient, isRedisConnected })` from server.js). Merges inventory into products by `variantId`→`sku` (InventoryItem has no productId). Computes per-product `inStock`/`visible` (`isVisible && in-stock`, DIGITAL always in stock) + `totalQuantity`. Redis keys `outpost:squarespace:cache` and `outpost:squarespace:assignments`. TTL-based background refresh (default 15 min). On startup it refreshes once **only if configured** (either auth option below) — otherwise it logs one warning and stays idle.
- `api/squarespaceOAuth.js` — OAuth 2.0 authorization-code flow, only needed on plans without Developer API Keys (`SQUARESPACE_API_KEY`). Scope is read-only: `website.products.read,website.inventory.read`. Redis key `outpost:squarespace:oauth:tokens` (access token ~30min, refresh token ~7 days and **rotates on every use** — both must be persisted on every refresh). `getValidAccessToken()` auto-refreshes ~10s before expiry; throws `SquarespaceNotAuthorizedError` if the one-time human step hasn't happened yet or the refresh token died.

Grouping is manual: `PUT /api/squarespace/products/:productId/assignment` tags a product with an opaque, admin-chosen `typeId`/`setId` (no catalog to validate against since the manual product catalog was retired); no auto-derivation from tags/storePageId.

**One-time setup once OAuth credentials arrive** (skip if using `SQUARESPACE_API_KEY` instead): set `SQUARESPACE_CLIENT_ID`/`SQUARESPACE_CLIENT_SECRET`/`SQUARESPACE_REDIRECT_URI`, deploy, then visit `/api/squarespace/oauth/authorize` once in a browser to grant access.

| Route                                                 | Purpose                                                                                         |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `GET /api/squarespace/products`                       | `{ fetchedAt, products }` merged catalog, each with its `assignment`                            |
| `POST /api/squarespace/refresh`                       | Force sync; 503 if unconfigured/unauthorized, 502 on upstream failure                           |
| `GET /api/squarespace/status`                         | Cache status + `oauth: { configured, authorized, accessTokenExpiresAt, refreshTokenExpiresAt }` |
| `PUT /api/squarespace/products/:productId/assignment` | Body `{ typeId, setId }` (null to unassign)                                                     |
| `GET /api/squarespace/oauth/authorize`                | Redirects to Squarespace's consent screen (one-time human step)                                 |
| `GET /api/squarespace/oauth/callback`                 | OAuth redirect_uri — exchanges the one-time code for tokens                                     |

### Events game type association

`SpecialEvent` stores `gameTypeId` and `gameTypeName` (replaces the old `setId` field which was never persisted). Admin forms populate the game type dropdown from the live Square catalog's top-level categories (`src/stores/squareCatalog.ts`, the same source `Products.vue` uses) — a category with no in-stock items today won't appear as an option — with a "Custom…" option for one-off events.

### Home page

Business-first and data-driven — the old WPN marketing-poster carousel (and its `/api/marketing-posters` endpoint and `public/wpn-assets/` images) was removed.

- Hero: what the shop is, live open/closed status (`StoreStatus.vue`), shop/events/directions actions
- This week: `getAgenda()` (`src/utils/eventOccurrences.ts`) for the next 7 days — specials plus weekly entries, honoring per-date overrides — rendered by `AgendaList.vue` (also used by `/events`)
- Shop by game: one tile per live catalog section, falling back to the headline games when the catalog is empty or not live
- New arrivals: newest in-stock items from `squareCatalog.newest`, preferring ones with a photo
- About (`id="about"`), community/socials (Linktree-led `SocialLinks.vue`), visit + per-day hours (`id="contact"`)

In-page navigation (the "Visit" nav item, cross-route anchors) is handled by `src/composables/useSectionNav.ts`, which delegates the scrolling itself to `src/utils/scrollToSection.ts`.

### Store hours and socials

Opening hours live in `api/storeConfig.json` (`openHours`, weekday → `["17:30", "22:00"]`, missing day = closed), shared by the API's catalog-cache TTL and the frontend (`src/config/storeInfo.ts` derives `STORE_INFO.hours`, `HOURS_BY_DAY`; `src/utils/storeHours.ts` computes open/closed). Changing hours is one edit there — plus the static `openingHoursSpecification` JSON-LD in `index.html`, which can't import it. The Linktree (`STORE_INFO.social.linktree`) is the hub for every social account, TikTok included; it leads wherever socials appear.

**Scrolling has exactly one owner per job — don't add a second.** `html { scroll-behavior: smooth }` in `src/style.css` governs in-page anchor scrolls, so no `scrollIntoView` call passes an explicit `behavior` (passing one from JS overrides CSS and silently defeats the `prefers-reduced-motion` override in that same file). Route changes are the opposite case and the router's `scrollBehavior` in `src/main.ts` sets `behavior: 'instant'` deliberately — smoothly animating to the top of a new page means animating the full height of the page just left. `scrollToSection.ts` also keeps only one retry chain alive at a time: the retries exist because data-driven sections (events, catalog) are still growing the page after mount, and two concurrent chains re-issuing scrolls at each other reads to a visitor as a frozen page.

### Deployment

- **Fly.io** (`fly.toml`) — combined `Dockerfile.combined` serves both the Vue SPA (Nginx) and API (Node.js) from one container
- **Redis**: Upstash (TLS via `rediss://` URL, auto-detected from `upstash.io` in hostname)
- `docker-compose.prod.yml` for self-hosted production

## Environment Variables

| Variable                   | Description                                                                                                                                          | Default                            |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `VITE_API_URL`             | Frontend API base                                                                                                                                    | `/api`                             |
| `REDIS_URL`                | Redis connection (supports `rediss://` for TLS)                                                                                                      | `redis://redis:6379`               |
| `API_PORT`                 | API port                                                                                                                                             | `3001`                             |
| `SQUARESPACE_API_KEY`      | Read-only Squarespace key (scopes `products:read`, `inventory:read`); integration idle if unset                                                      | —                                  |
| `SQUARESPACE_USER_AGENT`   | Descriptive User-Agent for Commerce API calls                                                                                                        | `TheOutpostGames-Website/1.0`      |
| `SQUARESPACE_CACHE_TTL_MS` | Cache TTL before background refresh                                                                                                                  | `900000` (15 min)                  |
| `GMAIL_USER`               | Gmail account sending the monthly inventory export (requires 2FA + an App Password); export job idle if unset                                        | —                                  |
| `GMAIL_APP_PASSWORD`       | App Password for `GMAIL_USER` (Google Account > Security > App Passwords)                                                                            | —                                  |
| `MAIL_TO`                  | Destination address for the monthly inventory export                                                                                                 | `theoutpostgamingrgv@gmail.com`    |
| `VITE_PRODUCTS_PAGE_LIVE`  | Frontend build-time flag — show the live Square-backed `/products` page instead of "Coming Soon"                                                     | `false`                            |
