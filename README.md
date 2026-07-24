# The Outpost Games

Web application for **The Outpost Games**, a TCG card shop in Rio Grande City, Texas. Covers Magic: The Gathering, Pokémon, One Piece, and other games.

**Live site:** https://outpostgamesrgv.com

---

## Store Info

- **Address:** 605 W. Main Street, Suite 4, Rio Grande City, TX 78582
- **Email:** theoutpostgamingrgv@gmail.com
- **Hours:** Thursday–Sunday, 5:00 PM – 10:00 PM
- **Facebook:** https://www.facebook.com/Theoutpostgames/
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
npm run build        # Type-check + production build
npm run type-check   # vue-tsc --noEmit
npm run lint         # ESLint
npm run lint:fix     # ESLint auto-fix
npm run format       # Prettier write
npm run pre-deploy   # format:check + lint + type-check
```

The dev server proxies `/api` requests to `http://localhost:3001`.

### API

```bash
cd api && npm install
npm run dev    # node --watch server.js → http://localhost:3001
npm start      # production
```

Health check: `http://localhost:3001/api/health`

### Local Full-Stack (Docker)

```bash
npm run docker:setup    # First-time setup
npm run docker:up       # Start Redis + API + Nginx
npm run docker:logs     # Tail logs
npm run docker:down     # Stop
```

See `local-dev/README.md` for details.

---

## Project Structure

```
├── src/
│   ├── views/
│   │   ├── Home.vue              # Landing page
│   │   ├── Products.vue          # Product catalog (game type sections + carousels)
│   │   ├── ProductsGameType.vue  # Single game type browse page with filters
│   │   ├── Events.vue            # Weekly schedule + upcoming special events
│   │   ├── About.vue
│   │   ├── Contact.vue
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
│   │   ├── events.ts      # Special events CRUD (Pinia)
│   │   ├── products.ts    # Product catalog CRUD (Pinia)
│   │   └── cart.ts        # Cart state (reserved for future e-commerce)
│   ├── components/
│   │   ├── AppHeader.vue
│   │   └── AppFooter.vue
│   ├── main.ts            # App entry + Vue Router setup
│   ├── App.vue
│   └── style.css          # Tailwind + brand theme variables
├── api/
│   ├── server.js             # Express API (events, products, TCGPlayer listings, Square routes)
│   ├── auth.js                # Redis-backed admin session auth
│   ├── squarePosClient.js     # Square Catalog/Inventory API client
│   ├── squareOrdersClient.js  # Square Orders API client (sales reporting)
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
| Square Sales | `/x/outpostAdmin/square-sales` | Sales-over-time chart + top products |
| Square Mass Inventory | `/x/outpostAdmin/square-mass-inventory` | Bulk on-hand count corrections in one save |

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

A separate system from the manual product catalog above — this talks directly to the shop's real Square point-of-sale account (catalog + inventory + sales), not the site's own Redis-backed `outpost:products` tree. It's admin-only today (see the four `/x/outpostAdmin/square-*` routes in the table above) and isn't wired into any public page.

**Sandbox vs. production**: every Square call is routed by `SQUARE_ENV` (`sandbox` or `production`) through `api/squarePosClient.js`'s `resolveSquareCredentials()`, which picks the matching pair of access token / application ID / location ID env vars below. Always test destructive changes against `SQUARE_ENV=sandbox` first.

**What the item-level fields actually do** (confirmed against a live Square account, not just docs):
- `track_inventory` — whether Square keeps an on-hand count for a variation at all. Off means "always in stock, no count."
- `sellable` — whether the variation can be rung up at the register. Used to mark draft/not-yet-released items (see WotC import script below) as visible-but-unpurchasable.
- `ecom_visibility` — **has no effect on this website or the physical POS.** It only controls visibility on Square's own optional online store, which this shop doesn't use. Safe to leave alone.

### Maintenance scripts (`api/scripts/`)

All follow the same convention: **preview by default, `--apply` to actually write.** Run from `api/`.

| Script | Command | Purpose |
|---|---|---|
| Sandbox sync | `npm run sync:sandbox -- --apply [--with-inventory]` | Wipes and recreates the sandbox catalog from a snapshot of production, for safe testing. `--with-inventory` also copies production on-hand counts into sandbox (otherwise every synced item starts at 0) — use it to validate inventory-display changes against realistic numbers before running scripts/routes against production |
| WotC SKU cross-reference | `npm run wotc:cross-reference -- <file.xlsx> [--create-drafts [--sellable]] [--update-existing] [--category "<Name>"]` | Cross-references a WPN/WotC set SKU sheet against the Square catalog: reports exact/possible matches and anything new; `--create-drafts` creates missing items as hidden, non-sellable drafts (add `--sellable` for a set that's already available to sell in-store, so new items go live instead); `--update-existing` corrects matched items' title/description/category to the sheet's official values |
| Reset negative inventory | `npm run inventory:reset-negative [-- --apply]` | Finds every variation with a negative on-hand count and sets it to 0 |

Drop downloaded WotC set xlsx files into `api/data/wotc-imports/` (gitignored) before running the cross-reference script — that folder exists specifically so these working files don't get committed.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in values:

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Frontend API base path | `/api` |
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

## WPN Assets

Magic set images are served from `/wpn-assets/` — these are WPN (Wizards Play Network) partner assets stored locally. See `WPN_ASSET_ACCESS_GUIDE.md` for the path conventions.
