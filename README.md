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
│   │       └── AdminTCGPlayerAdd.vue   # Add card listing
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
│   └── server.js          # Express API (events, products, TCGPlayer listings)
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

## Environment Variables

Copy `.env.example` to `.env` and fill in values:

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Frontend API base path | `/api` |
| `REDIS_URL` | Redis connection string | `redis://redis:6379` |
| `PORT` | API server port | `3001` |
| `NODE_ENV` | Environment | `production` |

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
