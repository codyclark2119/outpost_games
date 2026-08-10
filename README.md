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

| Layer         | Technology                                |
| ------------- | ----------------------------------------- |
| Frontend      | Vue 3 + TypeScript, Vite, Tailwind CSS v4 |
| State         | Pinia (composition-API stores)            |
| Routing       | Vue Router 4                              |
| Backend       | Node.js + Express (no TypeScript)         |
| Persistence   | Redis (Upstash in prod, Docker locally)   |
| Reverse proxy | Nginx                                     |
| Hosting       | Fly.io (Dallas region)                    |
| CDN           | Cloudflare                                |

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
│   │   ├── Home.vue              # One-page site: hero, marketing posters carousel, games, about, Instagram feed, Discord/Instagram CTA, contact
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
│   │       ├── AdminWeeklySchedule.vue # Hide one occurrence of a recurring weekly event
│   │       ├── AdminTCGPlayerPage.vue  # Manage single card listings
│   │       ├── AdminTCGPlayerAdd.vue   # Add card listing
│   │       ├── AdminSquareCatalog.vue      # Square catalog editor (items/variations/categories/images)
│   │       ├── AdminSquareStock.vue        # Square stock report (CSV export)
│   │       ├── AdminSquareSales.vue        # Square sales-over-time charts
│   │       ├── AdminSquareMassInventory.vue # Bulk inventory count corrections
│   │       └── AdminSquareRestock.vue      # Persisted box→packs restock pairs, one-click apply
│   ├── stores/
│   │   ├── events.ts         # Special events CRUD (Pinia)
│   │   ├── weeklyOverrides.ts # Per-date hide overrides for recurring weekly events (Pinia)
│   │   ├── squareCatalog.ts  # Live Square inventory for the public /products page — the shop's only product catalog (Pinia)
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
│   ├── server.js             # Express API (events, TCGPlayer listings, Square routes)
│   ├── auth.js                # Redis-backed admin session auth
│   ├── squarePosClient.js     # Square Catalog/Inventory API client
│   ├── squareOrdersClient.js  # Square Orders API client (sales reporting)
│   ├── inventoryExport.js     # Monthly inventory .xlsx export + scheduler
│   ├── mailClient.js          # Gmail SMTP wrapper (nodemailer)
│   └── scripts/               # Maintenance CLI tools — see "Square POS Catalog Admin" below
├── .github/workflows/
│   └── warm-hours.yml     # Cron that pins the Fly machine(s) awake during business hours
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

| Section               | Route                                   | Description                                                                                                                                                    |
| --------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard             | `/x/outpostAdmin`                       | Overview with links to all sections                                                                                                                            |
| Manage Events         | `/x/outpostAdmin/events`                | Edit/delete special tournament events                                                                                                                          |
| Add Event             | `/x/outpostAdmin/events/add`            | Create event with game type association                                                                                                                        |
| Weekly Schedule       | `/x/outpostAdmin/weekly-schedule`       | Hide one occurrence of a recurring weekly event for a specific date                                                                                            |
| Manage Listings       | `/x/outpostAdmin/tcgplayer`             | Edit/delete featured single card listings                                                                                                                      |
| Add Listing           | `/x/outpostAdmin/tcgplayer/add`         | Add a TCGPlayer card listing                                                                                                                                   |
| Square Catalog        | `/x/outpostAdmin/square-catalog`        | Edit Square items/variations, categories, images, deletion                                                                                                     |
| Square Stock Report   | `/x/outpostAdmin/square-stock`          | Read-only inventory report, CSV export                                                                                                                         |
| Square Sales          | `/x/outpostAdmin/square-sales`          | Revenue/order/AOV trends, category + payment-method + day-of-week/hour-of-day breakdowns, and a sortable/filterable top-products table with per-product profit |
| Square Mass Inventory | `/x/outpostAdmin/square-mass-inventory` | Bulk on-hand count corrections in one save                                                                                                                     |

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

## Square POS Catalog Admin

Talks directly to the shop's real Square point-of-sale account (catalog + inventory + sales) — this is the shop's only product catalog now; the old manually-managed Redis catalog was retired once Square management proved more intuitive for day-to-day use. Admin editing happens via the five `/x/outpostAdmin/square-*` routes in the table above — each groups its item list into collapsible sections by top-level Square category for faster navigation on a large catalog — and the public `/products` page (`Products.vue`/`ProductsGameType.vue`) renders straight from this same live inventory.

**Sandbox vs. production**: every Square call is routed by `SQUARE_ENV` (`sandbox` or `production`) through `api/squarePosClient.js`'s `resolveSquareCredentials()`, which picks the matching pair of access token / application ID / location ID env vars below. Always test destructive changes against `SQUARE_ENV=sandbox` first.

**What the item-level fields actually do** (confirmed against a live Square account, not just docs):

- `track_inventory` — whether Square keeps an on-hand count for a variation at all. Off means "always in stock, no count."
- `sellable` — whether the variation can be rung up at the register. Used to mark draft/not-yet-released items (see WotC import script below) as visible-but-unpurchasable.
- `ecom_visibility` — **has no effect on this website or the physical POS.** It only controls visibility on Square's own optional online store, which this shop doesn't use. Safe to leave alone.

**Unit cost / profit tracking**: Square's Catalog API has no built-in "cost of goods" field (confirmed live — nothing on `item_variation_data`). A `CatalogCustomAttributeDefinition` named "Unit Cost" (type `NUMBER`, scoped to `ITEM_VARIATION`, key `outpost_unit_cost`) was created once via a direct API call to fill that gap — it now shows up automatically in Square's own dashboard/reports too, not just here. It's edited per-variation in the Square Catalog Editor next to Price, and read/written in `api/squarePosClient.js` via `readCostCents()`/`buildCostAttributeValues()`. Square resolves the definition from its `key` alone on writes — no definition id needs to be stored or looked up anywhere in this codebase. Leaving it blank is a real, honest "unknown," never assumed to be $0 — the sales dashboard's profit figures reflect only products with a cost actually entered, and call out how many that is so the numbers are never silently misleading.

**Hiding an item from the website without affecting in-store sales**: since `ecom_visibility` is inert on this account (see above) and `sellable` also blocks the item at the physical register, neither one can be used to just declutter the public products page. A second `CatalogCustomAttributeDefinition` (type `BOOLEAN`, scoped to `ITEM`, key `outpost_hide_from_web`) was created the same way as `outpost_unit_cost` to fill that gap — read/written via `readHiddenFromWeb()`/`buildHiddenFromWebAttributeValues()` in `api/squarePosClient.js`, and checked directly in `getPublicSquareCatalog()` so a hidden item stays off the site regardless of current stock. It's the "Website visibility" control (per-item edit form) and "Toggle Visibility" bulk action in the Square Catalog Editor — both act only on this flag, leaving `sellable`/in-store availability completely untouched.

**"Newest First" sort on the public Products page**: Square's own `created_at` on an ITEM reflects whenever that catalog entry was last created/touched in Square, not when the product actually became available — bulk imports and catalog cleanups bump it without the product being new, which made a straight `created_at` sort unreliable (confirmed against this account's live data: several dozen unrelated items shared the same date from a bulk cleanup pass). A third `CatalogCustomAttributeDefinition` (type `STRING` — Square has no native `DATE` type, confirmed against the live `CatalogCustomAttributeDefinitionType` enum — scoped to `ITEM`, key `outpost_released_at`, storing an ISO `YYYY-MM-DD`) was created the same way to let staff set the real release/added date per item. Read/written via `readReleasedAt()`/`buildReleasedAtAttributeValues()` in `api/squarePosClient.js`; `getPublicSquareCatalog()`'s default ordering and the public site's "Newest First" sort option both use it when set, falling back to `itemCreatedAt` when it isn't. It's the "Released / Added Date" field (per-item edit form) and "Set Released Date" bulk action in the Square Catalog Editor.

**Categories vs. reporting category**: an item's `categories` (array) and `reporting_category` (single value) are independent fields on Square's side — the Dashboard, POS, and reports all read `reporting_category` as _the_ category, but it doesn't follow `categories` automatically. `updateSquareCatalogItem()` keeps both in sync on every category change; if you're debugging a category edit that "didn't stick," check whether these two have drifted apart on the raw catalog object.

**Monthly inventory export**: on the 1st of each month (store-local time), `api/inventoryExport.js` builds an `.xlsx` snapshot of the Square inventory report — non-snack items, sorted by stock status → category → quantity (lowest stock first, to surface aging stock) — and emails it via Gmail SMTP (`api/mailClient.js`) to `theoutpostgamingrgv@gmail.com`. Requires `GMAIL_USER`/`GMAIL_APP_PASSWORD` (see Environment Variables); idle with a log warning until set. Manual trigger for testing: `POST /api/admin/inventory-export/run` (admin auth).

**Uploading a product image**: Square's `CreateCatalogImage` endpoint _appends_ the new image to the target's `image_ids` rather than replacing or prepending it (confirmed live) — but every read path here treats `image_ids[0]` as "the" image. `uploadSquareCatalogImage()` does a follow-up write to move the new image to the front of that array; without it, a freshly uploaded image would never actually display anywhere (admin or public page) even though the upload itself "succeeded."

**Per-variation images**: variations can have their own photo distinct from the item's shared group photo (e.g. a "Foil Enhanced" printing needing different art than "Regular") — pass an ITEM_VARIATION id instead of an ITEM id to `uploadSquareCatalogImage()`; Square's API treats both the same way. Each variation falls back to the item's group photo automatically when it has no photo of its own (`hasOwnImage: false`), so nothing shows a broken/missing image just because that particular variation was never given its own shot. Admin route: `POST /api/square/products/:itemId/variations/:variationId/image`.

### Maintenance scripts (`api/scripts/`)

All follow the same convention: **preview by default, `--apply` to actually write.** Run from `api/`.

| Script                   | Command                                                                                                                | Purpose                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sandbox sync             | `npm run sync:sandbox -- --apply [--with-inventory]`                                                                   | Wipes and recreates the sandbox catalog from a snapshot of production, for safe testing. `--with-inventory` also copies production on-hand counts into sandbox (otherwise every synced item starts at 0) — use it to validate inventory-display changes against realistic numbers before running scripts/routes against production                                                                        |
| WotC SKU cross-reference | `npm run wotc:cross-reference -- <file.xlsx> [--create-drafts [--sellable]] [--update-existing] [--category "<Name>"]` | Cross-references a WPN/WotC set SKU sheet against the Square catalog: reports exact/possible matches and anything new; `--create-drafts` creates missing items as hidden, non-sellable drafts (add `--sellable` for a set that's already available to sell in-store, so new items go live instead); `--update-existing` corrects matched items' title/description/category to the sheet's official values |
| Reset negative inventory | `npm run inventory:reset-negative [-- --apply]`                                                                        | Finds every variation with a negative on-hand count and sets it to 0                                                                                                                                                                                                                                                                                                                                      |

Drop downloaded WotC set xlsx files into `api/data/wotc-imports/` (gitignored) before running the cross-reference script — that folder exists specifically so these working files don't get committed.

---

## Squarespace Integration (Legacy)

A read-only product source backed by the shop's Squarespace store, built before the Square POS integration above and now superseded by it — `api/server.js` itself marks these routes as "left in place only as documentation" and safe to remove once Square is fully validated. It isn't wired into any public page.

- `api/squarespaceClient.js` — HTTP layer (products = API `v2`, inventory = API `1.0`); auth via `SQUARESPACE_API_KEY` or OAuth.
- `api/squarespaceCache.js` — merges inventory into products by `variantId → sku`, Redis-cached with a TTL-based background refresh (default 15 min).
- `api/squarespaceOAuth.js` — OAuth 2.0 flow for plans without a Developer API Key; only needed if `SQUARESPACE_API_KEY` isn't set.

| Route                                                      | Purpose                                                                           |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `GET /api/squarespace/products`                            | Merged catalog with each product's `assignment`                                   |
| `POST /api/squarespace/refresh`                            | Force sync                                                                        |
| `GET /api/squarespace/status`                              | Cache + OAuth status                                                              |
| `PUT /api/squarespace/products/:productId/assignment`      | Tag a product with an opaque `{ typeId, setId }` (no catalog to validate against) |
| `GET /api/squarespace/oauth/authorize` / `/oauth/callback` | One-time OAuth consent flow                                                       |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in values:

| Variable                                                                           | Description                                                                                                          | Default                            |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `VITE_API_URL`                                                                     | Frontend API base path                                                                                               | `/api`                             |
| `VITE_PRODUCTS_PAGE_LIVE`                                                          | Build-time flag — show the live Square-backed `/products` page instead of "Coming Soon"                              | `false`                            |
| `REDIS_URL`                                                                        | Redis connection string                                                                                              | `redis://redis:6379`               |
| `PORT`                                                                             | API server port                                                                                                      | `3001`                             |
| `NODE_ENV`                                                                         | Environment                                                                                                          | `production`                       |
| `SQUARE_ENV`                                                                       | Which Square credential pair to use: `sandbox` or `production`                                                       | `sandbox`                          |
| `SQUARE_ACCESS_TOKEN`                                                              | Production Square access token                                                                                       | —                                  |
| `SQUARE_APPLICATION_ID`                                                            | Production Square application ID                                                                                     | —                                  |
| `SQUARE_LOCATION_ID`                                                               | Production Square location ID                                                                                        | —                                  |
| `SQUARE_SANDBOX_ACCESS_TOKEN`                                                      | Sandbox Square access token                                                                                          | —                                  |
| `SQUARE_SANDBOX_APPLICATION_ID`                                                    | Sandbox Square application ID                                                                                        | —                                  |
| `SQUARE_SANDBOX_LOCATION_ID`                                                       | Sandbox Square location ID (falls back to `SQUARE_LOCATION_ID` if unset)                                             | —                                  |
| `ADMIN_USERS`                                                                      | JSON array of `{ username, passwordHash }` for admin login (bcrypt hashes)                                           | —                                  |
| `GMAIL_USER`                                                                       | Gmail account sending the monthly inventory export (requires 2FA + an App Password); export idle if unset            | —                                  |
| `GMAIL_APP_PASSWORD`                                                               | App Password for `GMAIL_USER` (Google Account > Security > App Passwords)                                            | —                                  |
| `MAIL_TO`                                                                          | Destination address for the monthly inventory export                                                                 | `theoutpostgamingrgv@gmail.com`    |
| `MARKETING_POSTERS_DIR`                                                            | Where the API reads homepage carousel posters from; only needed if the default repo-root-relative path doesn't apply | `<repo>/public/wpn-assets/posters` |
| `SQUARESPACE_API_KEY`                                                              | Read-only Squarespace key (legacy integration); idle if unset                                                        | —                                  |
| `SQUARESPACE_USER_AGENT`                                                           | Descriptive User-Agent for Commerce API calls                                                                        | `TheOutpostGames-Website/1.0`      |
| `SQUARESPACE_CACHE_TTL_MS`                                                         | Cache TTL before background refresh                                                                                  | `900000` (15 min)                  |
| `SQUARESPACE_CLIENT_ID` / `SQUARESPACE_CLIENT_SECRET` / `SQUARESPACE_REDIRECT_URI` | OAuth credentials (only needed without `SQUARESPACE_API_KEY`)                                                        | —                                  |
| `WARM_WINDOW_SELF_PING`                                                            | Set `true` to enable the optional in-process warm-hours fallback ping (see "Warm Hours")                             | `false`                            |
| `WARM_WINDOW_SELF_PING_URL`                                                        | Override the self-ping target URL; defaults to `https://<FLY_APP_NAME>.fly.dev/api/health`                           | —                                  |

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

### Warm Hours

`fly.toml` keeps `auto_stop_machines`/`auto_start_machines` on with `min_machines_running = 0` — off-hours the machine sleeps after ~5 min idle and the next visitor eats a ~500ms cold start on wake. To avoid that during business hours without paying to stay warm 24/7, `.github/workflows/warm-hours.yml` pins the machine(s) awake on a schedule instead:

| Window                                  | Behavior                                                                |
| --------------------------------------- | ----------------------------------------------------------------------- |
| Noon – midnight, America/Chicago, daily | Guaranteed warm — the cron starts every machine at window open          |
| Midnight – noon, America/Chicago, daily | Normal wake-on-demand auto-sleep (today's existing behavior, unchanged) |

**DST**: GitHub Actions cron has no timezone support and runs in UTC, so the workflow uses one fixed UTC time per job, chosen so the window is never caught cold — see the comment block at the top of `warm-hours.yml` for the full noon/midnight → UTC table. Net effect: the store is never cold during business hours; the only cost is up to ~1 extra warm hour/day around whichever DST boundary doesn't line up exactly (a few cents).

**To change the warm-hours window later**: edit the two `cron:` lines in `warm-hours.yml` (and `WARM_WINDOW_START_HOUR` in `api/server.js` if the optional self-ping fallback is enabled) — that file's comment block has the conversion math.

**One manual step required**: create a Fly deploy token and add it as a repo secret:

```bash
fly tokens create deploy -x 999999h
```

Then: repo **Settings → Secrets and variables → Actions → New repository secret**, name it `FLY_API_TOKEN`, paste the token. Without this the workflow's `flyctl` calls will fail authentication.

An optional in-process fallback (belt-and-suspenders, off by default) is described under `WARM_WINDOW_SELF_PING` in Environment Variables above — the GitHub Actions cron is the primary mechanism and is sufficient on its own.

---

## Marketing Assets (`/wpn-assets/posters/`)

The homepage carousel is **fully filesystem-driven** — drop an image into `public/wpn-assets/posters/` and it appears automatically, no admin step required. `GET /api/marketing-posters` (`api/marketingPosters.js`) lists whatever's in that folder and titles each slide from its filename (e.g. `tmnt.jpg` → "Tmnt"); removing a file removes its slide. This replaced the old admin-managed Featured Items CRUD, which existed solely to power this carousel.

This is for **promotional/marketing posters**, not product photography — the product page uses Square's own hosted product photos for that instead (see "Square POS Catalog Admin" below). See `WPN_ASSET_ACCESS_GUIDE.md` for where to source official WPN marketing materials.

**Deployment note**: the API reads this folder directly off disk (not proxied through nginx), and its path resolution differs by environment — see `MARKETING_POSTERS_DIR` in Environment Variables and the comments in `Dockerfile.combined`/`local-dev/docker-compose.yml` if adding a new deployment target.
