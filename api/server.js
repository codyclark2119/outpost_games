// Catch all uncaught errors
process.on('uncaughtException', error => {
  console.error('❌ UNCAUGHT EXCEPTION:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION at:', promise, 'reason:', reason)
  process.exit(1)
})

console.log('🚀 Starting API server...')
console.log('📍 Node version:', process.version)
console.log('📂 Working directory:', process.cwd())
console.log('🔧 Environment:', process.env.NODE_ENV || 'development')

import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Load the repo-root .env explicitly — dotenv's default lookup is relative to
// process.cwd(), which is api/ under the documented `cd api && npm run dev`
// workflow, so it silently found nothing there. In production, real platform
// env vars (Fly secrets) always win regardless, since dotenv never overrides
// an already-set process.env value.
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') })

import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import { createClient } from 'redis'
import {
  initSquarespaceCache,
  bootstrapSquarespaceCache,
  getSquarespaceCatalog,
  refreshSquarespaceCatalog,
  getSquarespaceStatus,
  getAllAssignments,
  setAssignment,
} from './squarespaceCache.js'
import {
  initSquarespaceOAuth,
  getAuthorizeUrl,
  handleOAuthCallback,
  getOAuthStatus,
} from './squarespaceOAuth.js'
import {
  SquarespaceNotConfiguredError,
  SquarespaceNotAuthorizedError,
} from './squarespaceErrors.js'
import {
  getSquareConfigurationStatus,
  testSquareConnection,
  getSquareInventoryReport,
  listSquareCategories,
  getSquareCatalogItem,
  updateSquareCatalogItem,
  createSquareCategory,
  renameSquareCategory,
  reparentSquareCategory,
  deleteSquareCategory,
  mergeSquareCategories,
  deleteSquareCatalogItem,
  deleteSquareCatalogVariation,
  addSquareCatalogVariation,
  deleteSquareCatalogItemsBatch,
  setSquareCatalogItemsCategoryBatch,
  setSquareCatalogItemsVisibilityBatch,
  setSquareCatalogItemsReleasedAtBatch,
  uploadSquareCatalogImage,
  adjustSquareInventoryCount,
  adjustSquareInventoryCountBatch,
  applyBoxToPackRestock,
  resolveSquareCredentials,
  SquareVersionMismatchError,
} from './squarePosClient.js'
import { getSquareSalesReport } from './squareOrdersClient.js'
import {
  initSquarePublicCatalogCache,
  bootstrapSquarePublicCatalogCache,
  getCachedPublicSquareCatalog,
  refreshSquarePublicCatalog,
  getSquarePublicCatalogStatus,
} from './squarePublicCatalogCache.js'
import {
  initAuth,
  verifyCredentials,
  createSession,
  destroySession,
  requireAdminAuth,
} from './auth.js'
import {
  initInventoryExport,
  runMonthlyInventoryExport,
  startInventoryExportScheduler,
} from './inventoryExport.js'
import { isMailConfigured, MailNotConfiguredError } from './mailClient.js'
import { listMarketingPosters } from './marketingPosters.js'
import multer from 'multer'

console.log('✅ Modules imported successfully')

const app = express()

// Requests arrive through two trusted proxy hops in production — Cloudflare's edge,
// then Fly.io's own internal proxy — both of which append to X-Forwarded-For. Without
// this, Express's default `trust proxy: false` makes express-rate-limit reject every
// request outright (it refuses to trust an X-Forwarded-For header it wasn't told to
// expect), and req.ip would resolve to the last proxy rather than the real client.
app.set('trust proxy', 2)

const PORT = process.env.API_PORT || 3001
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379'

console.log('📡 Redis URL configured:', REDIS_URL.replace(/:[^:@]+@/, ':****@'))
console.log('🌐 Port configured:', PORT)

// Middleware
const DEFAULT_ALLOWED_ORIGINS = [
  'https://outpostgamesrgv.com',
  'https://www.outpostgamesrgv.com',
  'http://localhost:5173', // Vite dev server
  'http://localhost:3001', // direct API access (e.g. Postman/curl during dev)
  'http://localhost', // local-dev docker-compose's web container (nginx on port 80 — no port in the Origin header since 80 is HTTP's default)
  'http://127.0.0.1', // same as above, when accessed by IP instead of hostname
]
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)
  .concat(DEFAULT_ALLOWED_ORIGINS)

app.use(
  cors({
    origin: (origin, callback) => {
      // Same-origin requests (curl, server-to-server, no Origin header) have no origin at all.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
      callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
  })
)
app.use(express.json())
app.use(cookieParser())

console.log('✅ Middleware configured')

const loginRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 15 * 60 * 1000,
  limit: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' },
})

// Redis client setup with TLS support for Upstash
const redisClient = createClient({
  url: REDIS_URL,
  socket: {
    tls: REDIS_URL.includes('upstash.io'),
    reconnectStrategy: retries => {
      if (retries > 10) {
        console.log('Too many attempts to reconnect to Redis, giving up')
        return new Error('Too many retries')
      }
      return retries * 100
    },
  },
})

redisClient.on('error', err => console.error('Redis Client Error:', err.message))
redisClient.on('connect', () => console.log('✅ Connected to Redis'))
redisClient.on('reconnecting', () => console.log('🔄 Reconnecting to Redis...'))

let redisConnected = false

// Wire the Squarespace cache + OAuth token store to server.js's single Redis
// client + the live connection flag (passed as a getter so it always reads
// the current value).
initSquarespaceCache({ redisClient, isRedisConnected: () => redisConnected })
initSquarespaceOAuth({ redisClient, isRedisConnected: () => redisConnected })
initSquarePublicCatalogCache({ redisClient, isRedisConnected: () => redisConnected })
initAuth({ redisClient, isRedisConnected: () => redisConnected })
initInventoryExport({ redisClient, isRedisConnected: () => redisConnected })

// Try to connect to Redis (non-blocking)
;(async () => {
  try {
    await redisClient.connect()
    redisConnected = true
    await initializeEvents()
    await initializeListings()
  } catch (err) {
    console.warn('⚠️  Redis not available, running without persistence:', err.message)
    console.log('📝 Events will be stored in memory only')
  } finally {
    // Kick off the initial Squarespace refresh once the Redis state is settled
    // (connected or not). No-ops with a one-time warning if no API key is set.
    bootstrapSquarespaceCache()
    bootstrapSquarePublicCatalogCache()
    // Checks hourly for the 1st of the month (store-local time); no-ops until
    // GMAIL_USER/GMAIL_APP_PASSWORD are configured.
    startInventoryExportScheduler()
  }
})()

// In-memory fallback storage
let memoryEvents = []

// Default events data
const DEFAULT_EVENTS = [
  {
    id: '1',
    title: 'Prerelease Tournament',
    date: 'February 15, 2026',
    time: '12:00 PM',
    entry: '30.00',
    description:
      'Get your hands on the latest set before official release! Sealed format with 6 booster packs and prize support.',
  },
  {
    id: '2',
    title: 'Commander Night',
    date: 'February 20, 2026',
    time: '6:00 PM',
    entry: '5.00',
    description:
      'Casual Commander games with rotating pods. Great for new and experienced players alike!',
  },
  {
    id: '3',
    title: 'Modern Championship',
    date: 'March 1, 2026',
    time: '1:00 PM',
    entry: '25.00',
    description:
      'Competitive Modern format tournament. Top 8 players receive prize support and store credit.',
  },
]

const EVENTS_KEY = 'outpost:events'

// Initialize Redis with default events if empty
const initializeEvents = async () => {
  try {
    if (!redisConnected) {
      memoryEvents = [...DEFAULT_EVENTS]
      console.log('Initialized in-memory storage with default events')
      return
    }

    const exists = await redisClient.exists(EVENTS_KEY)
    if (!exists) {
      await redisClient.set(EVENTS_KEY, JSON.stringify(DEFAULT_EVENTS))
      console.log('Initialized Redis with default events')
    }
  } catch (error) {
    console.warn('Redis initialization failed, using memory:', error.message)
    memoryEvents = [...DEFAULT_EVENTS]
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API is running',
    redis: redisConnected ? 'connected' : 'disconnected (using memory)',
    timestamp: new Date().toISOString(),
  })
})

// ─── Admin auth ──────────────────────────────────────────────────────────────
// `secure` is gated on actually running on Fly.io (not NODE_ENV, which this repo's
// .env sets to "production" even for local dev) so the session cookie still works
// over plain http://localhost while requiring HTTPS in the real deployment.
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: Boolean(process.env.FLY_APP_NAME),
  sameSite: 'strict',
  maxAge: 12 * 60 * 60 * 1000, // 12 hours
}

app.post('/api/auth/login', loginRateLimiter, async (req, res) => {
  try {
    const { username, password } = req.body || {}
    const valid = await verifyCredentials(username, password)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    const sessionId = await createSession(username)
    res.cookie('sid', sessionId, SESSION_COOKIE_OPTIONS)
    res.json({ ok: true, username })
  } catch (error) {
    console.error('❌ Login failed:', error.message)
    res.status(500).json({ error: 'Login failed' })
  }
})

app.post('/api/auth/logout', async (req, res) => {
  await destroySession(req.cookies?.sid)
  res.clearCookie('sid', SESSION_COOKIE_OPTIONS)
  res.json({ ok: true })
})

app.get('/api/auth/me', requireAdminAuth, (req, res) => {
  res.json({ username: req.admin.username })
})

// Homepage carousel — fully filesystem-driven, see marketingPosters.js.
app.get('/api/marketing-posters', async (req, res) => {
  try {
    const posters = await listMarketingPosters(process.env)
    res.json({ ok: true, posters })
  } catch (error) {
    console.error('❌ Marketing posters listing failed:', error.message)
    res.status(500).json({ ok: false, error: 'Failed to list marketing posters' })
  }
})

// Get all events
app.get('/api/events', async (req, res) => {
  try {
    if (!redisConnected) {
      return res.json(memoryEvents)
    }

    const eventsData = await redisClient.get(EVENTS_KEY)
    const events = eventsData ? JSON.parse(eventsData) : []
    res.json(events)
  } catch (error) {
    console.error('Error fetching events:', error)
    // Fallback to memory if Redis fails
    res.json(memoryEvents)
  }
})

// Add new event
app.post('/api/events', requireAdminAuth, async (req, res) => {
  try {
    const { title, date, time, entry, description, gameTypeId, gameTypeName } = req.body

    if (!title || !date || !time || !entry || !description) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    const newEvent = {
      id: Date.now().toString(),
      title,
      date,
      time,
      entry,
      description,
      ...(gameTypeId && { gameTypeId }),
      ...(gameTypeName && { gameTypeName }),
    }

    if (!redisConnected) {
      memoryEvents.push(newEvent)
      return res.status(201).json(newEvent)
    }

    const eventsData = await redisClient.get(EVENTS_KEY)
    const events = eventsData ? JSON.parse(eventsData) : []

    events.push(newEvent)
    await redisClient.set(EVENTS_KEY, JSON.stringify(events))

    res.status(201).json(newEvent)
  } catch (error) {
    console.error('Error adding event:', error)
    res.status(500).json({ error: 'Failed to add event' })
  }
})

// Update event
app.put('/api/events/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    if (!redisConnected) {
      const index = memoryEvents.findIndex(e => e.id === id)
      if (index === -1) {
        return res.status(404).json({ error: 'Event not found' })
      }
      memoryEvents[index] = { ...memoryEvents[index], ...updates, id: memoryEvents[index].id }
      return res.json(memoryEvents[index])
    }

    const eventsData = await redisClient.get(EVENTS_KEY)
    const events = eventsData ? JSON.parse(eventsData) : []

    const index = events.findIndex(e => e.id === id)
    if (index === -1) {
      return res.status(404).json({ error: 'Event not found' })
    }

    events[index] = {
      ...events[index],
      ...updates,
      id: events[index].id, // Preserve the original id
    }

    await redisClient.set(EVENTS_KEY, JSON.stringify(events))
    res.json(events[index])
  } catch (error) {
    console.error('Error updating event:', error)
    res.status(500).json({ error: 'Failed to update event' })
  }
})

// Delete event
app.delete('/api/events/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params

    if (!redisConnected) {
      const originalLength = memoryEvents.length
      memoryEvents = memoryEvents.filter(e => e.id !== id)
      if (memoryEvents.length === originalLength) {
        return res.status(404).json({ error: 'Event not found' })
      }
      return res.json({ message: 'Event deleted successfully' })
    }

    const eventsData = await redisClient.get(EVENTS_KEY)
    const events = eventsData ? JSON.parse(eventsData) : []

    const filteredEvents = events.filter(e => e.id !== id)

    if (filteredEvents.length === events.length) {
      return res.status(404).json({ error: 'Event not found' })
    }

    await redisClient.set(EVENTS_KEY, JSON.stringify(filteredEvents))
    res.json({ message: 'Event deleted successfully' })
  } catch (error) {
    console.error('Error deleting event:', error)
    res.status(500).json({ error: 'Failed to delete event' })
  }
})

// Reset to default events
app.post('/api/events/reset', requireAdminAuth, async (req, res) => {
  try {
    if (!redisConnected) {
      memoryEvents = [...DEFAULT_EVENTS]
      return res.json(DEFAULT_EVENTS)
    }
    await redisClient.set(EVENTS_KEY, JSON.stringify(DEFAULT_EVENTS))
    res.json(DEFAULT_EVENTS)
  } catch (error) {
    console.error('Error resetting events:', error)
    res.status(500).json({ error: 'Failed to reset events' })
  }
})

// ─── Weekly recurring event overrides ────────────────────────────────────────
// Hides one specific occurrence of a WEEKLY_SCHEDULE entry (src/config/weeklySchedule.ts)
// without touching the recurring definition itself — e.g. a holiday cancellation,
// or a special event overriding that day. Hiding = create a record here;
// un-hiding = delete it. No seed data — an empty list is the valid default.
let memoryWeeklyOverrides = []

const WEEKLY_OVERRIDES_KEY = 'outpost:weeklyOverrides'

// Get all weekly overrides
app.get('/api/weekly-overrides', async (req, res) => {
  try {
    if (!redisConnected) {
      return res.json(memoryWeeklyOverrides)
    }

    const data = await redisClient.get(WEEKLY_OVERRIDES_KEY)
    const overrides = data ? JSON.parse(data) : []
    res.json(overrides)
  } catch (error) {
    console.error('Error fetching weekly overrides:', error)
    res.json(memoryWeeklyOverrides)
  }
})

// Hide one occurrence of a recurring weekly event
app.post('/api/weekly-overrides', requireAdminAuth, async (req, res) => {
  try {
    const { weeklyEventId, date, reason } = req.body

    if (!weeklyEventId || !date) {
      return res.status(400).json({ error: 'weeklyEventId and date are required' })
    }

    const newOverride = {
      id: Date.now().toString(),
      weeklyEventId,
      date,
      ...(reason && { reason }),
    }

    if (!redisConnected) {
      memoryWeeklyOverrides.push(newOverride)
      return res.status(201).json(newOverride)
    }

    const data = await redisClient.get(WEEKLY_OVERRIDES_KEY)
    const overrides = data ? JSON.parse(data) : []

    overrides.push(newOverride)
    await redisClient.set(WEEKLY_OVERRIDES_KEY, JSON.stringify(overrides))

    res.status(201).json(newOverride)
  } catch (error) {
    console.error('Error adding weekly override:', error)
    res.status(500).json({ error: 'Failed to add weekly override' })
  }
})

// Un-hide — delete the override record
app.delete('/api/weekly-overrides/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params

    if (!redisConnected) {
      const originalLength = memoryWeeklyOverrides.length
      memoryWeeklyOverrides = memoryWeeklyOverrides.filter(o => o.id !== id)
      if (memoryWeeklyOverrides.length === originalLength) {
        return res.status(404).json({ error: 'Weekly override not found' })
      }
      return res.json({ message: 'Weekly override deleted successfully' })
    }

    const data = await redisClient.get(WEEKLY_OVERRIDES_KEY)
    const overrides = data ? JSON.parse(data) : []

    const filtered = overrides.filter(o => o.id !== id)
    if (filtered.length === overrides.length) {
      return res.status(404).json({ error: 'Weekly override not found' })
    }

    await redisClient.set(WEEKLY_OVERRIDES_KEY, JSON.stringify(filtered))
    res.json({ message: 'Weekly override deleted successfully' })
  } catch (error) {
    console.error('Error deleting weekly override:', error)
    res.status(500).json({ error: 'Failed to delete weekly override' })
  }
})

// TCGPlayer listings endpoint - Manual Management
const TCGPLAYER_LISTINGS_KEY = 'outpost:tcgplayer:listings'
const SHOP_SELLER_ID = '61af7a3a'
const TCGPLAYER_SHOP_URL = `https://www.tcgplayer.com/search/all/product?seller=${SHOP_SELLER_ID}&view=grid&page=1`

// Sample default listings
const DEFAULT_LISTINGS = [
  {
    id: 'tcg-sample-1',
    name: 'Sample Card - Add Your Own!',
    setName: 'Your Set Here',
    price: 0,
    priceDisplay: 'See TCGPlayer',
    imageUrl: null,
    productUrl: TCGPLAYER_SHOP_URL,
    condition: 'NM',
    foiling: 'Normal',
    quantityInStock: 0,
    seller: 'The Outpost Games',
    createdAt: new Date().toISOString(),
  },
]

// Initialize listings
const initializeListings = async () => {
  try {
    if (!redisConnected) {
      // Already have default in memory
      return
    }

    const exists = await redisClient.exists(TCGPLAYER_LISTINGS_KEY)
    if (!exists) {
      await redisClient.set(TCGPLAYER_LISTINGS_KEY, JSON.stringify(DEFAULT_LISTINGS))
      console.log('Initialized TCGPlayer listings with sample data')
    }
  } catch (error) {
    console.warn('TCGPlayer listings initialization failed:', error.message)
  }
}

// Get all listings
app.get('/api/tcgplayer-listings', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20

    let allListings = []

    if (redisConnected) {
      const data = await redisClient.get(TCGPLAYER_LISTINGS_KEY)
      allListings = data ? JSON.parse(data) : DEFAULT_LISTINGS
    } else {
      allListings = DEFAULT_LISTINGS
    }

    // Pagination
    const startIndex = (page - 1) * limit
    const endIndex = page * limit
    const paginatedListings = allListings.slice(startIndex, endIndex)

    res.json({
      listings: paginatedListings,
      page,
      limit,
      totalResults: paginatedListings.length,
      totalListings: allListings.length,
      timestamp: new Date().toISOString(),
      shopUrl: TCGPLAYER_SHOP_URL,
    })

    console.log(`✅ Returned ${paginatedListings.length} TCGPlayer listings (page ${page})`)
  } catch (error) {
    console.error('❌ Error fetching TCGPlayer listings:', error.message)
    res.status(500).json({
      error: 'Failed to fetch listings',
      message: error.message,
      listings: [],
    })
  }
})

// Add a new listing
app.post('/api/tcgplayer-listings', requireAdminAuth, async (req, res) => {
  try {
    const { name, setName, price, condition, foiling, quantityInStock, imageUrl, productUrl } =
      req.body

    if (!name || !setName || price === undefined) {
      return res.status(400).json({ error: 'name, setName, and price are required' })
    }

    const newListing = {
      id: `tcg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      setName,
      price: parseFloat(price),
      priceDisplay: `$${parseFloat(price).toFixed(2)}`,
      condition: condition || 'NM',
      foiling: foiling || 'Normal',
      quantityInStock: parseInt(quantityInStock) || 1,
      imageUrl: imageUrl || null,
      productUrl: productUrl || TCGPLAYER_SHOP_URL,
      seller: 'The Outpost Games',
      createdAt: new Date().toISOString(),
    }

    let listings = []

    if (redisConnected) {
      const data = await redisClient.get(TCGPLAYER_LISTINGS_KEY)
      listings = data ? JSON.parse(data) : []
      listings.push(newListing)
      await redisClient.set(TCGPLAYER_LISTINGS_KEY, JSON.stringify(listings))
    } else {
      DEFAULT_LISTINGS.push(newListing)
      listings = DEFAULT_LISTINGS
    }

    console.log(`✅ Added new TCGPlayer listing: ${newListing.name}`)
    res.status(201).json(newListing)
  } catch (error) {
    console.error('❌ Error adding listing:', error.message)
    res.status(500).json({ error: 'Failed to add listing', message: error.message })
  }
})

// Update a listing
app.put('/api/tcgplayer-listings/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    let listings = []

    if (redisConnected) {
      const data = await redisClient.get(TCGPLAYER_LISTINGS_KEY)
      listings = data ? JSON.parse(data) : []
    } else {
      listings = DEFAULT_LISTINGS
    }

    const index = listings.findIndex(l => l.id === id)
    if (index === -1) {
      return res.status(404).json({ error: 'Listing not found' })
    }

    listings[index] = {
      ...listings[index],
      ...updates,
      id: listings[index].id, // Preserve ID
      priceDisplay: updates.price
        ? `$${parseFloat(updates.price).toFixed(2)}`
        : listings[index].priceDisplay,
      updatedAt: new Date().toISOString(),
    }

    if (redisConnected) {
      await redisClient.set(TCGPLAYER_LISTINGS_KEY, JSON.stringify(listings))
    }

    console.log(`✅ Updated listing: ${listings[index].name}`)
    res.json(listings[index])
  } catch (error) {
    console.error('❌ Error updating listing:', error.message)
    res.status(500).json({ error: 'Failed to update listing', message: error.message })
  }
})

// Delete a listing
app.delete('/api/tcgplayer-listings/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params

    let listings = []

    if (redisConnected) {
      const data = await redisClient.get(TCGPLAYER_LISTINGS_KEY)
      listings = data ? JSON.parse(data) : []
    } else {
      listings = DEFAULT_LISTINGS
    }

    const filteredListings = listings.filter(l => l.id !== id)

    if (filteredListings.length === listings.length) {
      return res.status(404).json({ error: 'Listing not found' })
    }

    if (redisConnected) {
      await redisClient.set(TCGPLAYER_LISTINGS_KEY, JSON.stringify(filteredListings))
    } else {
      DEFAULT_LISTINGS.length = 0
      DEFAULT_LISTINGS.push(...filteredListings)
    }

    console.log(`✅ Deleted listing: ${id}`)
    res.json({ message: 'Listing deleted successfully' })
  } catch (error) {
    console.error('❌ Error deleting listing:', error.message)
    res.status(500).json({ error: 'Failed to delete listing', message: error.message })
  }
})

// Clear all listings
app.delete('/api/tcgplayer-listings', requireAdminAuth, async (req, res) => {
  try {
    if (redisConnected) {
      await redisClient.del(TCGPLAYER_LISTINGS_KEY)
    } else {
      DEFAULT_LISTINGS.length = 0
    }

    console.log('✅ Cleared all TCGPlayer listings')
    res.json({ message: 'All listings cleared successfully' })
  } catch (error) {
    console.error('❌ Error clearing listings:', error.message)
    res.status(500).json({ error: 'Failed to clear listings', message: error.message })
  }
})

// ─── Square POS Integration (sandbox-first) ─────────────────────────────────
// This is an additive surface for validating Square POS credentials and catalog
// access before any production rollout.

app.get('/api/square/status', requireAdminAuth, async (req, res) => {
  try {
    const status = getSquareConfigurationStatus(process.env)
    res.json({
      ok: true,
      ...status,
      apiBaseUrl:
        status.environment === 'production'
          ? 'https://connect.squareup.com'
          : 'https://connect.squareupsandbox.com',
    })
  } catch (error) {
    console.error('❌ Error getting Square status:', error.message)
    res.status(500).json({ error: 'Failed to read Square configuration' })
  }
})

app.post('/api/square/test', requireAdminAuth, async (req, res) => {
  try {
    const status = getSquareConfigurationStatus(process.env)
    if (!status.configured) {
      return res.status(422).json({
        ok: false,
        error: 'Square credentials are incomplete',
        message:
          'The Square integration needs SQUARE_ACCESS_TOKEN, SQUARE_APPLICATION_ID, and SQUARE_LOCATION_ID.',
        missingFields: status.missingFields,
      })
    }

    const result = await testSquareConnection(process.env)
    res.json({ ok: true, ...result })
  } catch (error) {
    console.error('❌ Square connection test failed:', error.message)
    res.status(502).json({
      ok: false,
      error: 'Square connection test failed',
      message: error.message,
    })
  }
})

app.get('/api/square/catalog', requireAdminAuth, async (req, res) => {
  try {
    const { createSquarePosClient, resolveSquareCredentials } = await import('./squarePosClient.js')
    const client = createSquarePosClient(resolveSquareCredentials(process.env))
    const payload = await client.request('/v2/catalog/list?types=ITEM')
    res.json({ ok: true, environment: client.environment, items: payload.objects || [] })
  } catch (error) {
    console.error('❌ Square catalog fetch failed:', error.message)
    res.status(502).json({
      ok: false,
      error: 'Square catalog fetch failed',
      message: error.message,
    })
  }
})

app.get('/api/square/inventory-report', requireAdminAuth, async (req, res) => {
  try {
    const report = await getSquareInventoryReport(process.env)
    res.json(report)
  } catch (error) {
    console.error('❌ Square inventory report failed:', error.message)
    res.status(502).json({
      ok: false,
      error: 'Square inventory report failed',
      message: error.message,
    })
  }
})

// Public, cached, read-only catalog for the customer-facing Products page —
// deliberately not requireAdminAuth. Never calls Square directly on request;
// always served from squarePublicCatalogCache's Redis/memory cache, which
// refreshes itself in the background per its store-hours-aware TTL.
app.get('/api/square/public-catalog', async (req, res) => {
  try {
    const cache = await getCachedPublicSquareCatalog()
    res.json({ ok: true, ...cache })
  } catch (error) {
    console.error('❌ Square public catalog fetch failed:', error.message)
    res.status(502).json({
      ok: false,
      error: 'Square public catalog fetch failed',
      message: error.message,
    })
  }
})

// Fire-and-forget: called after every admin write that could change what the
// public Products page shows (image, name, price, category, stock, deletion).
// Without this, an admin's edit only reaches customers once the store-hours
// TTL in squarePublicCatalogCache.js next expires (up to an hour open, a day
// closed) — which reads as "the save didn't work" even though it did.
const invalidatePublicCatalog = () => {
  refreshSquarePublicCatalog().catch(() => {}) // failure is already logged inside refreshSquarePublicCatalog
}

app.post('/api/square/public-catalog/refresh', requireAdminAuth, async (req, res) => {
  try {
    const cache = await refreshSquarePublicCatalog()
    res.json({ ok: true, ...cache })
  } catch (error) {
    console.error('❌ Square public catalog refresh failed:', error.message)
    res.status(502).json({
      ok: false,
      error: 'Square public catalog refresh failed',
      message: error.message,
    })
  }
})

app.get('/api/square/public-catalog/status', requireAdminAuth, (req, res) => {
  res.json({ ok: true, ...getSquarePublicCatalogStatus() })
})

app.get('/api/square/categories', requireAdminAuth, async (req, res) => {
  try {
    const categories = await listSquareCategories(process.env)
    res.json({ ok: true, categories })
  } catch (error) {
    console.error('❌ Square categories fetch failed:', error.message)
    res
      .status(502)
      .json({ ok: false, error: 'Square categories fetch failed', message: error.message })
  }
})

app.post('/api/square/categories', requireAdminAuth, async (req, res) => {
  try {
    const { name, parentCategoryId } = req.body || {}
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' })
    }

    const category = await createSquareCategory(
      { name: name.trim(), parentCategoryId: parentCategoryId || null },
      process.env
    )
    res.json({ ok: true, category })
  } catch (error) {
    console.error('❌ Square category creation failed:', error.message)
    res
      .status(502)
      .json({ ok: false, error: 'Square category creation failed', message: error.message })
  }
})

app.put('/api/square/categories/:categoryId', requireAdminAuth, async (req, res) => {
  try {
    const { name } = req.body || {}
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' })
    }

    const category = await renameSquareCategory(req.params.categoryId, name.trim(), process.env)
    invalidatePublicCatalog()
    res.json({ ok: true, category })
  } catch (error) {
    console.error('❌ Square category rename failed:', error.message)
    res
      .status(502)
      .json({ ok: false, error: 'Square category rename failed', message: error.message })
  }
})

app.put('/api/square/categories/:categoryId/parent', requireAdminAuth, async (req, res) => {
  try {
    const parentCategoryId = req.body?.parentCategoryId ?? null
    const category = await reparentSquareCategory(req.params.categoryId, parentCategoryId, process.env)
    invalidatePublicCatalog()
    res.json({ ok: true, category })
  } catch (error) {
    console.error('❌ Square category re-parent failed:', error.message)
    res
      .status(502)
      .json({ ok: false, error: 'Square category re-parent failed', message: error.message })
  }
})

app.delete('/api/square/categories/:categoryId', requireAdminAuth, async (req, res) => {
  try {
    await deleteSquareCategory(req.params.categoryId, process.env)
    invalidatePublicCatalog()
    res.json({ ok: true })
  } catch (error) {
    // A refusal (still referenced / has children) is a normal, expected
    // outcome here — surfaced as 409 with the guard's own message, not a 502.
    console.error('❌ Square category delete refused/failed:', error.message)
    res.status(409).json({ ok: false, error: error.message })
  }
})

app.post('/api/square/categories/:fromCategoryId/merge', requireAdminAuth, async (req, res) => {
  try {
    const { toCategoryId } = req.body || {}
    if (!toCategoryId) {
      return res.status(400).json({ error: 'toCategoryId is required' })
    }
    if (toCategoryId === req.params.fromCategoryId) {
      return res.status(400).json({ error: 'Cannot merge a category into itself' })
    }

    const result = await mergeSquareCategories(req.params.fromCategoryId, toCategoryId, process.env)
    invalidatePublicCatalog()
    res.json({ ok: true, mergedItemCount: result.mergedItemCount })
  } catch (error) {
    console.error('❌ Square category merge failed:', error.message)
    res.status(502).json({ ok: false, error: 'Square category merge failed', message: error.message })
  }
})

app.get('/api/square/products/:itemId', requireAdminAuth, async (req, res) => {
  try {
    const item = await getSquareCatalogItem(req.params.itemId, process.env)
    res.json({ ok: true, item })
  } catch (error) {
    console.error('❌ Square product fetch failed:', error.message)
    res
      .status(502)
      .json({ ok: false, error: 'Square product fetch failed', message: error.message })
  }
})

app.put('/api/square/products/:itemId', requireAdminAuth, async (req, res) => {
  try {
    const body = req.body || {}
    const touchesSku =
      Object.prototype.hasOwnProperty.call(body, 'sku') ||
      (body.variations || []).some(variation =>
        Object.prototype.hasOwnProperty.call(variation, 'sku')
      )
    if (touchesSku) {
      return res
        .status(400)
        .json({
          error: 'SKU cannot be edited here — it is locked to protect in-store barcode scanning',
        })
    }
    if (body.releasedAt != null && !/^\d{4}-\d{2}-\d{2}$/.test(body.releasedAt)) {
      return res.status(400).json({ error: 'releasedAt must be an ISO date (YYYY-MM-DD)' })
    }

    const updated = await updateSquareCatalogItem(req.params.itemId, body, process.env)
    invalidatePublicCatalog()
    res.json({ ok: true, item: updated })
  } catch (error) {
    if (error instanceof SquareVersionMismatchError) {
      return res.status(409).json({ error: error.message })
    }
    console.error('❌ Square product update failed:', error.message)
    res
      .status(502)
      .json({ ok: false, error: 'Square product update failed', message: error.message })
  }
})

app.delete('/api/square/products/:itemId', requireAdminAuth, async (req, res) => {
  try {
    const result = await deleteSquareCatalogItem(req.params.itemId, process.env)
    invalidatePublicCatalog()
    res.json({ ok: true, deletedIds: result.deleted_object_ids || [] })
  } catch (error) {
    console.error('❌ Square product delete failed:', error.message)
    res
      .status(502)
      .json({ ok: false, error: 'Square product delete failed', message: error.message })
  }
})

// Bulk actions (admin multi-select). AdminSquareCatalog.vue's list is one row
// per variation, so selection is keyed by itemId — every route here operates
// on whole ITEMs, chunked internally via Square's real batch endpoints.
app.post('/api/square/products/batch-delete', requireAdminAuth, async (req, res) => {
  try {
    const itemIds = Array.isArray(req.body?.itemIds) ? req.body.itemIds : []
    if (!itemIds.length) return res.status(400).json({ error: 'itemIds must be a non-empty array' })

    const result = await deleteSquareCatalogItemsBatch(itemIds, process.env)
    invalidatePublicCatalog()
    res.json({ ok: true, deletedIds: result.deletedIds })
  } catch (error) {
    console.error('❌ Square bulk delete failed:', error.message)
    res.status(502).json({ ok: false, error: 'Square bulk delete failed', message: error.message })
  }
})

app.post('/api/square/products/batch-category', requireAdminAuth, async (req, res) => {
  try {
    const itemIds = Array.isArray(req.body?.itemIds) ? req.body.itemIds : []
    if (!itemIds.length) return res.status(400).json({ error: 'itemIds must be a non-empty array' })
    const categoryId = req.body?.categoryId ?? null

    const result = await setSquareCatalogItemsCategoryBatch(itemIds, categoryId, process.env)
    invalidatePublicCatalog()
    res.json({ ok: true, updatedCount: result.objects.length })
  } catch (error) {
    console.error('❌ Square bulk category update failed:', error.message)
    res
      .status(502)
      .json({ ok: false, error: 'Square bulk category update failed', message: error.message })
  }
})

app.post('/api/square/products/batch-visibility', requireAdminAuth, async (req, res) => {
  try {
    const itemIds = Array.isArray(req.body?.itemIds) ? req.body.itemIds : []
    if (!itemIds.length) return res.status(400).json({ error: 'itemIds must be a non-empty array' })
    const { hiddenFromWeb, sellable } = req.body || {}
    if (hiddenFromWeb === undefined && sellable === undefined) {
      return res.status(400).json({ error: 'hiddenFromWeb and/or sellable is required' })
    }

    const result = await setSquareCatalogItemsVisibilityBatch(
      itemIds,
      { hiddenFromWeb, sellable },
      process.env
    )
    invalidatePublicCatalog()
    res.json({ ok: true, updatedCount: result.objects.length })
  } catch (error) {
    console.error('❌ Square bulk visibility update failed:', error.message)
    res
      .status(502)
      .json({ ok: false, error: 'Square bulk visibility update failed', message: error.message })
  }
})

app.post('/api/square/products/batch-released-at', requireAdminAuth, async (req, res) => {
  try {
    const itemIds = Array.isArray(req.body?.itemIds) ? req.body.itemIds : []
    if (!itemIds.length) return res.status(400).json({ error: 'itemIds must be a non-empty array' })
    const releasedAt = req.body?.releasedAt ?? null
    if (releasedAt !== null && !/^\d{4}-\d{2}-\d{2}$/.test(releasedAt)) {
      return res.status(400).json({ error: 'releasedAt must be an ISO date (YYYY-MM-DD) or null' })
    }

    const result = await setSquareCatalogItemsReleasedAtBatch(itemIds, releasedAt, process.env)
    invalidatePublicCatalog()
    res.json({ ok: true, updatedCount: result.objects.length })
  } catch (error) {
    console.error('❌ Square bulk released-at update failed:', error.message)
    res
      .status(502)
      .json({ ok: false, error: 'Square bulk released-at update failed', message: error.message })
  }
})

app.delete(
  '/api/square/products/:itemId/variations/:variationId',
  requireAdminAuth,
  async (req, res) => {
    try {
      const result = await deleteSquareCatalogVariation(
        req.params.itemId,
        req.params.variationId,
        process.env
      )
      invalidatePublicCatalog()
      res.json({ ok: true, deletedIds: result.deleted_object_ids || [] })
    } catch (error) {
      console.error('❌ Square variation delete failed:', error.message)
      res
        .status(502)
        .json({ ok: false, error: 'Square variation delete failed', message: error.message })
    }
  }
)

app.post('/api/square/products/:itemId/variations', requireAdminAuth, async (req, res) => {
  try {
    const { name, sku, priceCents, trackInventory, sellable } = req.body || {}
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Variation name is required' })
    }
    if (priceCents !== undefined && priceCents !== null && (!Number.isFinite(priceCents) || priceCents < 0)) {
      return res.status(400).json({ error: 'priceCents must be a non-negative number' })
    }

    await addSquareCatalogVariation(
      req.params.itemId,
      { name: name.trim(), sku: sku?.trim() || undefined, priceCents: priceCents ?? null, trackInventory, sellable },
      process.env
    )
    const item = await getSquareCatalogItem(req.params.itemId, process.env)
    invalidatePublicCatalog()
    res.status(201).json({ ok: true, item })
  } catch (error) {
    console.error('❌ Square add variation failed:', error.message)
    res
      .status(502)
      .json({ ok: false, error: 'Square add variation failed', message: error.message })
  }
})

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // Square's own max: 15MB
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg', 'image/pjpeg', 'image/png', 'image/gif'].includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, or GIF images are supported'))
    }
    cb(null, true)
  },
})

app.post('/api/square/products/:itemId/image', requireAdminAuth, (req, res) => {
  imageUpload.single('image')(req, res, async uploadError => {
    if (uploadError) {
      return res.status(400).json({ error: uploadError.message })
    }
    if (!req.file) {
      return res.status(400).json({ error: 'An image file is required' })
    }

    try {
      const result = await uploadSquareCatalogImage(
        req.params.itemId,
        {
          buffer: req.file.buffer,
          filename: req.file.originalname,
          mimeType: req.file.mimetype,
        },
        process.env
      )
      invalidatePublicCatalog()
      res.json({ ok: true, imageUrl: result.imageUrl })
    } catch (error) {
      console.error('❌ Square image upload failed:', error.message)
      res
        .status(502)
        .json({ ok: false, error: 'Square image upload failed', message: error.message })
    }
  })
})

// A variation's own photo (distinct from the item's shared group photo) —
// e.g. "Foil Enhanced" needing different art than "Regular". Square's
// CreateCatalogImage endpoint accepts an ITEM_VARIATION id the same way it
// does an ITEM id, so this reuses the identical upload/reorder logic.
app.post(
  '/api/square/products/:itemId/variations/:variationId/image',
  requireAdminAuth,
  (req, res) => {
    imageUpload.single('image')(req, res, async uploadError => {
      if (uploadError) {
        return res.status(400).json({ error: uploadError.message })
      }
      if (!req.file) {
        return res.status(400).json({ error: 'An image file is required' })
      }

      try {
        const result = await uploadSquareCatalogImage(
          req.params.variationId,
          {
            buffer: req.file.buffer,
            filename: req.file.originalname,
            mimeType: req.file.mimetype,
          },
          process.env
        )
        invalidatePublicCatalog()
        res.json({ ok: true, imageUrl: result.imageUrl })
      } catch (error) {
        console.error('❌ Square variation image upload failed:', error.message)
        res
          .status(502)
          .json({ ok: false, error: 'Square variation image upload failed', message: error.message })
      }
    })
  }
)

app.post('/api/square/products/:itemId/inventory', requireAdminAuth, async (req, res) => {
  try {
    const quantity = Number(req.body?.quantity)
    const { variationId } = req.body || {}
    if (!Number.isFinite(quantity) || quantity < 0) {
      return res.status(400).json({ error: 'quantity must be a non-negative number' })
    }
    if (!variationId) {
      return res.status(400).json({ error: 'variationId is required' })
    }

    const item = await getSquareCatalogItem(req.params.itemId, process.env)
    if (!item.variations.some(variation => variation.id === variationId)) {
      return res.status(422).json({ error: 'That variation does not belong to this item' })
    }

    const { locationId } = resolveSquareCredentials(process.env)
    await adjustSquareInventoryCount(variationId, { quantity, locationId }, process.env)
    invalidatePublicCatalog()
    res.json({ ok: true, quantity })
  } catch (error) {
    console.error('❌ Square inventory correction failed:', error.message)
    res
      .status(502)
      .json({ ok: false, error: 'Square inventory correction failed', message: error.message })
  }
})

app.post('/api/square/inventory/batch', requireAdminAuth, async (req, res) => {
  try {
    const changes = Array.isArray(req.body?.changes) ? req.body.changes : []
    if (!changes.length) {
      return res.status(400).json({ error: 'changes must be a non-empty array' })
    }
    for (const change of changes) {
      const quantity = Number(change.quantity)
      if (!change.variationId || !Number.isFinite(quantity) || quantity < 0) {
        return res
          .status(400)
          .json({ error: 'Each change requires a variationId and a non-negative quantity' })
      }
    }

    // Validate every variationId against a fresh report rather than trusting
    // client-supplied ids blindly, matching the single-item inventory route.
    const report = await getSquareInventoryReport(process.env)
    const knownVariationIds = new Set(report.items.map(item => item.id))
    const unknownIds = changes.map(c => c.variationId).filter(id => !knownVariationIds.has(id))
    if (unknownIds.length) {
      return res.status(422).json({ error: 'Unknown variation id(s)', unknownIds })
    }

    const result = await adjustSquareInventoryCountBatch(
      changes.map(c => ({ variationId: c.variationId, quantity: Number(c.quantity) })),
      process.env
    )
    invalidatePublicCatalog()
    res.json({ ok: true, updatedCount: result.updatedCount })
  } catch (error) {
    console.error('❌ Square batch inventory correction failed:', error.message)
    res
      .status(502)
      .json({
        ok: false,
        error: 'Square batch inventory correction failed',
        message: error.message,
      })
  }
})

// Quick Restock — persisted box-of-sealed-packs -> loose-pack pairings.
// Square has no native "kit"/bundle concept for this (confirmed via Square's
// own developer forum), so the relationship itself lives here in Redis, same
// convention as outpost:tcgplayer:listings — plain flat CRUD, no TTL/
// orchestration complexity, so no separate init*() module is warranted.
const RESTOCK_MAPPINGS_KEY = 'outpost:square:restock-mappings'
let memoryRestockMappings = [] // in-memory fallback; empty array is a valid default

app.get('/api/square/restock-mappings', requireAdminAuth, async (req, res) => {
  try {
    if (!redisConnected) return res.json({ ok: true, mappings: memoryRestockMappings })
    const data = await redisClient.get(RESTOCK_MAPPINGS_KEY)
    res.json({ ok: true, mappings: data ? JSON.parse(data) : [] })
  } catch (error) {
    console.error('❌ Error fetching restock mappings:', error.message)
    res.status(500).json({ ok: false, error: 'Failed to fetch restock mappings' })
  }
})

app.post('/api/square/restock-mappings', requireAdminAuth, async (req, res) => {
  try {
    const { boxVariationId, boxName, packsVariationId, packsName, packsPerBox } = req.body || {}
    if (!boxVariationId || !packsVariationId) {
      return res.status(400).json({ error: 'boxVariationId and packsVariationId are required' })
    }
    if (boxVariationId === packsVariationId) {
      return res.status(400).json({ error: 'Box and packs must be different variations' })
    }
    if (!Number.isInteger(packsPerBox) || packsPerBox <= 0) {
      return res.status(400).json({ error: 'packsPerBox must be a positive integer' })
    }

    // Validate both ids are real, current variations rather than trusting
    // client-supplied ids blindly, matching the existing batch-inventory route.
    const report = await getSquareInventoryReport(process.env)
    const knownVariationIds = new Set(report.items.map(item => item.id))
    if (!knownVariationIds.has(boxVariationId) || !knownVariationIds.has(packsVariationId)) {
      return res.status(422).json({ error: 'Unknown variation id(s)' })
    }

    const mapping = {
      id: crypto.randomUUID(),
      boxVariationId,
      boxName: boxName || '',
      packsVariationId,
      packsName: packsName || '',
      packsPerBox,
    }

    if (!redisConnected) {
      memoryRestockMappings.push(mapping)
      return res.status(201).json({ ok: true, mapping })
    }

    const data = await redisClient.get(RESTOCK_MAPPINGS_KEY)
    const mappings = data ? JSON.parse(data) : []
    mappings.push(mapping)
    await redisClient.set(RESTOCK_MAPPINGS_KEY, JSON.stringify(mappings))
    res.status(201).json({ ok: true, mapping })
  } catch (error) {
    console.error('❌ Error creating restock mapping:', error.message)
    res.status(500).json({ ok: false, error: 'Failed to create restock mapping' })
  }
})

app.delete('/api/square/restock-mappings/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params

    if (!redisConnected) {
      const originalLength = memoryRestockMappings.length
      memoryRestockMappings = memoryRestockMappings.filter(m => m.id !== id)
      if (memoryRestockMappings.length === originalLength) {
        return res.status(404).json({ error: 'Restock mapping not found' })
      }
      return res.json({ ok: true })
    }

    const data = await redisClient.get(RESTOCK_MAPPINGS_KEY)
    const mappings = data ? JSON.parse(data) : []
    const filtered = mappings.filter(m => m.id !== id)
    if (filtered.length === mappings.length) {
      return res.status(404).json({ error: 'Restock mapping not found' })
    }
    await redisClient.set(RESTOCK_MAPPINGS_KEY, JSON.stringify(filtered))
    res.json({ ok: true })
  } catch (error) {
    console.error('❌ Error deleting restock mapping:', error.message)
    res.status(500).json({ ok: false, error: 'Failed to delete restock mapping' })
  }
})

app.post('/api/square/restock-mappings/:id/apply', requireAdminAuth, async (req, res) => {
  try {
    const boxesOpened = Number(req.body?.boxesOpened)
    if (!Number.isInteger(boxesOpened) || boxesOpened <= 0) {
      return res.status(400).json({ error: 'boxesOpened must be a positive integer' })
    }

    let mappings
    if (!redisConnected) {
      mappings = memoryRestockMappings
    } else {
      const data = await redisClient.get(RESTOCK_MAPPINGS_KEY)
      mappings = data ? JSON.parse(data) : []
    }
    const mapping = mappings.find(m => m.id === req.params.id)
    if (!mapping) return res.status(404).json({ error: 'Restock mapping not found' })

    const result = await applyBoxToPackRestock(
      {
        boxVariationId: mapping.boxVariationId,
        packsVariationId: mapping.packsVariationId,
        packsPerBox: mapping.packsPerBox,
        boxesOpened,
      },
      process.env
    )
    invalidatePublicCatalog()
    res.json({ ok: true, ...result })
  } catch (error) {
    console.error('❌ Square restock apply failed:', error.message)
    res.status(502).json({ ok: false, error: 'Square restock apply failed', message: error.message })
  }
})

app.get('/api/square/sales', requireAdminAuth, async (req, res) => {
  try {
    const to = req.query.to ? new Date(req.query.to).toISOString() : new Date().toISOString()
    const from = req.query.from
      ? new Date(req.query.from).toISOString()
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const granularity = ['week', 'month'].includes(req.query.granularity) ? req.query.granularity : 'day'

    const report = await getSquareSalesReport({ from, to, granularity }, process.env)
    res.json(report)
  } catch (error) {
    console.error('❌ Square sales report failed:', error.message)
    res.status(502).json({ ok: false, error: 'Square sales report failed', message: error.message })
  }
})

// Manual trigger for the monthly inventory export — lets an admin test the
// email/xlsx pipeline on demand, or re-run it if the 1st was missed (e.g. the
// server was down). The scheduler in inventoryExport.js otherwise fires this
// automatically once per month.
app.post('/api/admin/inventory-export/run', requireAdminAuth, async (req, res) => {
  if (!isMailConfigured(process.env)) {
    return res
      .status(503)
      .json({ ok: false, error: 'Email is not configured — set GMAIL_USER and GMAIL_APP_PASSWORD' })
  }
  try {
    const result = await runMonthlyInventoryExport(process.env)
    res.json({ ok: true, ...result })
  } catch (error) {
    if (error instanceof MailNotConfiguredError) {
      return res.status(503).json({ ok: false, error: error.message })
    }
    console.error('❌ Manual inventory export failed:', error.message)
    res.status(502).json({ ok: false, error: 'Inventory export failed', message: error.message })
  }
})

// Legacy Squarespace routes are left in place only as documentation and can be
// removed later once the Square integration is fully validated.
app.get('/api/squarespace/products', async (req, res) => {
  try {
    const [{ fetchedAt, products }, assignments] = await Promise.all([
      getSquarespaceCatalog(),
      getAllAssignments(),
    ])
    const withAssignments = products.map(p => ({
      ...p,
      assignment: Object.hasOwn(assignments, p.id)
        ? assignments[p.id]
        : { typeId: null, setId: null },
    }))
    res.json({ fetchedAt, products: withAssignments })
  } catch (error) {
    console.error('❌ Error fetching Squarespace products:', error.message)
    res.status(500).json({ error: 'Failed to fetch Squarespace products' })
  }
})

// POST /api/squarespace/refresh — force a synchronous full refresh from Squarespace.
app.post('/api/squarespace/refresh', requireAdminAuth, async (req, res) => {
  try {
    const cache = await refreshSquarespaceCatalog()
    res.json({ fetchedAt: cache.fetchedAt, productCount: cache.products.length })
  } catch (error) {
    if (error instanceof SquarespaceNotConfiguredError) {
      return res
        .status(503)
        .json({ error: 'Squarespace is not configured', message: error.message })
    }
    if (error instanceof SquarespaceNotAuthorizedError) {
      return res.status(503).json({
        error: 'Squarespace is not authorized',
        message: error.message,
        authorizeUrl: '/api/squarespace/oauth/authorize',
      })
    }
    console.error('❌ Squarespace refresh failed:', error.message)
    res.status(502).json({ error: 'Failed to refresh from Squarespace', message: error.message })
  }
})

// GET /api/squarespace/status — merges cache/product status with OAuth status
// (configured/authorized/token expiry) so both auth paths are visible at once.
app.get('/api/squarespace/status', async (req, res) => {
  const oauthStatus = await getOAuthStatus()
  res.json({ ...getSquarespaceStatus(), oauth: oauthStatus })
})

// GET /api/squarespace/oauth/authorize — one-time human step: open this in a
// browser after setting SQUARESPACE_CLIENT_ID/SECRET/REDIRECT_URI to grant
// access on Squarespace's confirmation page. Only needed on plans without
// Developer API Keys; skip entirely if using SQUARESPACE_API_KEY instead.
app.get('/api/squarespace/oauth/authorize', (req, res) => {
  try {
    res.redirect(getAuthorizeUrl())
  } catch (error) {
    res
      .status(503)
      .json({ error: "Squarespace OAuth isn't configured yet", message: error.message })
  }
})

// GET /api/squarespace/oauth/callback — this must be the exact redirect_uri
// registered with Squarespace. Exchanges the one-time code for tokens.
// Responds with JSON (not res.send of an interpolated string) deliberately —
// query params here are attacker-controlled since this is a public GET route,
// and JSON can't be interpreted as HTML/script by a browser the way a
// text/html response with reflected input could.
app.get('/api/squarespace/oauth/callback', async (req, res) => {
  try {
    await handleOAuthCallback({
      code: req.query.code,
      state: req.query.state,
      error: req.query.error,
    })
    res.json({
      success: true,
      message: 'Squarespace connected successfully. You can close this tab.',
    })
  } catch (error) {
    console.error('❌ Squarespace OAuth callback failed:', error.message)
    res.status(400).json({ success: false, error: error.message })
  }
})

// PUT /api/squarespace/products/:productId/assignment — tag a Squarespace product
// with a typeId/setId (or null to unassign). typeId/setId are opaque, admin-chosen
// strings — no catalog to validate them against since the manual product catalog
// was retired.
app.put('/api/squarespace/products/:productId/assignment', requireAdminAuth, async (req, res) => {
  try {
    const { productId } = req.params
    const { typeId = null, setId = null } = req.body || {}

    if (typeId === null && setId !== null) {
      // A setId can't be scoped to anything without a typeId.
      return res.status(400).json({ error: 'setId requires a typeId' })
    }

    const assignment = await setAssignment(productId, { typeId, setId })
    res.json({ productId, assignment })
  } catch (error) {
    console.error('❌ Error setting Squarespace assignment:', error.message)
    res.status(500).json({ error: 'Failed to set assignment' })
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API server running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`)
  if (!redisConnected) {
    console.log('⚠️  Running without Redis - data will not persist across restarts')
  }
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server')
  if (redisConnected) {
    await redisClient.quit()
  }
  process.exit(0)
})
