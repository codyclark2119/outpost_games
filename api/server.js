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
import { SquarespaceNotConfiguredError, SquarespaceNotAuthorizedError } from './squarespaceErrors.js'
import {
  getSquareConfigurationStatus,
  testSquareConnection,
  getSquareInventoryReport,
  listSquareCategories,
  getSquareCatalogItem,
  updateSquareCatalogItem,
  createSquareCategory,
  deleteSquareCatalogItem,
  deleteSquareCatalogVariation,
  uploadSquareCatalogImage,
  adjustSquareInventoryCount,
  adjustSquareInventoryCountBatch,
  resolveSquareCredentials,
  SquareVersionMismatchError,
} from './squarePosClient.js'
import { getSquareSalesReport } from './squareOrdersClient.js'
import { initAuth, verifyCredentials, createSession, destroySession, requireAdminAuth } from './auth.js'
import multer from 'multer'

console.log('✅ Modules imported successfully')

const app = express()
const PORT = process.env.API_PORT || 3001
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379'

console.log('📡 Redis URL configured:', REDIS_URL.replace(/:[^:@]+@/, ':****@'))
console.log('🌐 Port configured:', PORT)

// Middleware
const DEFAULT_ALLOWED_ORIGINS = [
  'https://outpostgamesrgv.com',
  'https://www.outpostgamesrgv.com',
  'http://localhost:5173',
  'http://localhost:3001',
]
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)
  .concat(DEFAULT_ALLOWED_ORIGINS)

app.use(cors({
  origin: (origin, callback) => {
    // Same-origin requests (curl, server-to-server, no Origin header) have no origin at all.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))
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
initAuth({ redisClient, isRedisConnected: () => redisConnected })

// Try to connect to Redis (non-blocking)
;(async () => {
  try {
    await redisClient.connect()
    redisConnected = true
    await initializeEvents()
    await initializeListings()
    await initializeCatalog()
  } catch (err) {
    console.warn('⚠️  Redis not available, running without persistence:', err.message)
    console.log('📝 Events will be stored in memory only')
  } finally {
    // Kick off the initial Squarespace refresh once the Redis state is settled
    // (connected or not). No-ops with a one-time warning if no API key is set.
    bootstrapSquarespaceCache()
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

// ─── Product Catalog ────────────────────────────────────────────────────────
const PRODUCTS_KEY = 'outpost:products'

const DEFAULT_CATALOG = {
  types: [
    {
      id: 'magic',
      name: 'Magic: The Gathering',
      isVisible: true,
      sortOrder: 0,
      sets: [
        { id: 'tarkir-dragonstorm', name: 'Tarkir: Dragonstorm', imageUrl: '/wpn-assets/tarkir-dragonstorm/product-images/set-symbols/TDM_expsym_m_3in.png', isVisible: true, sortOrder: 0, products: [] },
        { id: 'edge-eternities', name: 'Edge of Eternities', imageUrl: '/wpn-assets/edge-eternities/product-images/set-symbols/EOE_expsym_m_3in.png', isVisible: true, sortOrder: 1, products: [] },
        { id: 'final-fantasy', name: 'Final Fantasy', imageUrl: '/wpn-assets/final-fantasy/product-images/set-symbols/FIN_main_expsym_m_3in.png', isVisible: true, sortOrder: 2, products: [] },
        { id: 'avatar-last-airbender', name: 'Avatar: The Last Airbender', imageUrl: '/wpn-assets/avatar-last-airbender/product-images/set-symbols/TLAMythic_3in.png', isVisible: true, sortOrder: 3, products: [] },
        { id: 'spiderman', name: 'Spider-Man', imageUrl: '/wpn-assets/spiderman/product-images/set-symbols/SPM_expsym_m_3in.png', isVisible: true, sortOrder: 4, products: [] },
        { id: 'tmnt', name: 'Teenage Mutant Ninja Turtles', imageUrl: '/wpn-assets/tmnt/product-images/set-symbols/MTGTMT_expsym_M.png', isVisible: true, sortOrder: 5, products: [] },
        { id: 'lorwyn-eclipsed', name: 'Lorwyn Eclipsed', imageUrl: '/wpn-assets/lorwyn-eclipsed/product-images/set-symbols/MTGECL_expsymb_m.png', isVisible: true, sortOrder: 6, products: [] },
        { id: 'duskmourn', name: 'Duskmourn: House of Horror', imageUrl: '/wpn-assets/duskmourn-house-horror/product-images/set-symbols/SetSymbol_Web/DSKC_expsym_m_web_800x800.png', isVisible: true, sortOrder: 7, products: [] },
        { id: 'outlaws-thunder-junction', name: 'Outlaws of Thunder Junction', imageUrl: '/wpn-assets/outlaws-thunder-junction/product-images/set-symbols/OTJ_expsym_m_web_800x800.png', isVisible: true, sortOrder: 8, products: [] },
        { id: 'secrets-strixhaven', name: 'Secrets of Strixhaven', imageUrl: '/wpn-assets/secrets-strixhaven/product-images/set-logos/MTGSOS_EN_SetLogo_4C.png', isVisible: false, sortOrder: 9, products: [] },
      ],
    },
    {
      id: 'pokemon',
      name: 'Pokémon',
      isVisible: true,
      sortOrder: 1,
      sets: [],
    },
    {
      id: 'one-piece',
      name: 'One Piece Card Game',
      isVisible: true,
      sortOrder: 2,
      sets: [],
    },
    {
      id: 'other',
      name: 'Other Games',
      isVisible: true,
      sortOrder: 3,
      sets: [],
    },
  ],
}

let memoryCatalog = JSON.parse(JSON.stringify(DEFAULT_CATALOG))

const getCatalog = async () => {
  if (!redisConnected) return JSON.parse(JSON.stringify(memoryCatalog))
  try {
    const data = await redisClient.get(PRODUCTS_KEY)
    return data ? JSON.parse(data) : JSON.parse(JSON.stringify(DEFAULT_CATALOG))
  } catch {
    return JSON.parse(JSON.stringify(memoryCatalog))
  }
}

const saveCatalog = async catalog => {
  if (!redisConnected) { memoryCatalog = JSON.parse(JSON.stringify(catalog)); return }
  await redisClient.set(PRODUCTS_KEY, JSON.stringify(catalog))
}

const initializeCatalog = async () => {
  try {
    if (!redisConnected) { memoryCatalog = JSON.parse(JSON.stringify(DEFAULT_CATALOG)); return }
    const exists = await redisClient.exists(PRODUCTS_KEY)
    if (!exists) {
      await redisClient.set(PRODUCTS_KEY, JSON.stringify(DEFAULT_CATALOG))
      console.log('✅ Initialized product catalog with defaults')
    }
  } catch (error) {
    console.warn('⚠️  Product catalog initialization failed:', error.message)
    memoryCatalog = JSON.parse(JSON.stringify(DEFAULT_CATALOG))
  }
}

// GET /api/products
app.get('/api/products', async (req, res) => {
  try {
    const catalog = await getCatalog()
    res.json(catalog)
  } catch (error) {
    console.error('❌ Error fetching catalog:', error.message)
    res.status(500).json({ error: 'Failed to fetch products' })
  }
})

// POST /api/products/types
app.post('/api/products/types', requireAdminAuth, async (req, res) => {
  try {
    const { name } = req.body
    if (!name) return res.status(400).json({ error: 'name is required' })
    const catalog = await getCatalog()
    const newType = { id: `type-${Date.now()}`, name, isVisible: true, sortOrder: catalog.types.length, sets: [] }
    catalog.types.push(newType)
    await saveCatalog(catalog)
    res.status(201).json(newType)
  } catch (error) {
    console.error('❌ Error creating type:', error.message)
    res.status(500).json({ error: 'Failed to create type' })
  }
})

// PUT /api/products/types/:typeId
app.put('/api/products/types/:typeId', requireAdminAuth, async (req, res) => {
  try {
    const { typeId } = req.params
    const updates = req.body
    const catalog = await getCatalog()
    const type = catalog.types.find(t => t.id === typeId)
    if (!type) return res.status(404).json({ error: 'Type not found' })
    const sets = type.sets
    Object.assign(type, updates, { id: type.id, sets })
    await saveCatalog(catalog)
    res.json(type)
  } catch (error) {
    console.error('❌ Error updating type:', error.message)
    res.status(500).json({ error: 'Failed to update type' })
  }
})

// DELETE /api/products/types/:typeId
app.delete('/api/products/types/:typeId', requireAdminAuth, async (req, res) => {
  try {
    const { typeId } = req.params
    const catalog = await getCatalog()
    const idx = catalog.types.findIndex(t => t.id === typeId)
    if (idx === -1) return res.status(404).json({ error: 'Type not found' })
    catalog.types.splice(idx, 1)
    await saveCatalog(catalog)
    res.json({ message: 'Type deleted' })
  } catch (error) {
    console.error('❌ Error deleting type:', error.message)
    res.status(500).json({ error: 'Failed to delete type' })
  }
})

// POST /api/products/types/:typeId/sets
app.post('/api/products/types/:typeId/sets', requireAdminAuth, async (req, res) => {
  try {
    const { typeId } = req.params
    const { name, imageUrl } = req.body
    if (!name) return res.status(400).json({ error: 'name is required' })
    const catalog = await getCatalog()
    const type = catalog.types.find(t => t.id === typeId)
    if (!type) return res.status(404).json({ error: 'Type not found' })
    const newSet = { id: `set-${Date.now()}`, name, imageUrl: imageUrl || null, isVisible: true, sortOrder: type.sets.length, products: [] }
    type.sets.push(newSet)
    await saveCatalog(catalog)
    res.status(201).json(newSet)
  } catch (error) {
    console.error('❌ Error creating set:', error.message)
    res.status(500).json({ error: 'Failed to create set' })
  }
})

// PUT /api/products/sets/:setId
app.put('/api/products/sets/:setId', requireAdminAuth, async (req, res) => {
  try {
    const { setId } = req.params
    const updates = req.body
    const catalog = await getCatalog()
    let found = null
    for (const type of catalog.types) {
      const set = type.sets.find(s => s.id === setId)
      if (set) { found = set; break }
    }
    if (!found) return res.status(404).json({ error: 'Set not found' })
    const products = found.products
    Object.assign(found, updates, { id: found.id, products })
    await saveCatalog(catalog)
    res.json(found)
  } catch (error) {
    console.error('❌ Error updating set:', error.message)
    res.status(500).json({ error: 'Failed to update set' })
  }
})

// DELETE /api/products/sets/:setId
app.delete('/api/products/sets/:setId', requireAdminAuth, async (req, res) => {
  try {
    const { setId } = req.params
    const catalog = await getCatalog()
    let deleted = false
    for (const type of catalog.types) {
      const idx = type.sets.findIndex(s => s.id === setId)
      if (idx !== -1) { type.sets.splice(idx, 1); deleted = true; break }
    }
    if (!deleted) return res.status(404).json({ error: 'Set not found' })
    await saveCatalog(catalog)
    res.json({ message: 'Set deleted' })
  } catch (error) {
    console.error('❌ Error deleting set:', error.message)
    res.status(500).json({ error: 'Failed to delete set' })
  }
})

// POST /api/products/sets/:setId/products
app.post('/api/products/sets/:setId/products', requireAdminAuth, async (req, res) => {
  try {
    const { setId } = req.params
    const { name, description, price, imageUrl } = req.body
    if (!name) return res.status(400).json({ error: 'name is required' })
    const catalog = await getCatalog()
    let targetSet = null
    for (const type of catalog.types) {
      const set = type.sets.find(s => s.id === setId)
      if (set) { targetSet = set; break }
    }
    if (!targetSet) return res.status(404).json({ error: 'Set not found' })
    const newProduct = {
      id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name,
      description: description || '',
      price: price !== undefined && price !== null && price !== '' ? parseFloat(price) : null,
      imageUrl: imageUrl || null,
      isVisible: true,
      sortOrder: targetSet.products.length,
    }
    targetSet.products.push(newProduct)
    await saveCatalog(catalog)
    res.status(201).json(newProduct)
  } catch (error) {
    console.error('❌ Error creating product:', error.message)
    res.status(500).json({ error: 'Failed to create product' })
  }
})

// PUT /api/products/items/:itemId
app.put('/api/products/items/:itemId', requireAdminAuth, async (req, res) => {
  try {
    const { itemId } = req.params
    const updates = req.body
    const catalog = await getCatalog()
    let found = null
    outer: for (const type of catalog.types) {
      for (const set of type.sets) {
        const prod = set.products.find(p => p.id === itemId)
        if (prod) { found = prod; break outer }
      }
    }
    if (!found) return res.status(404).json({ error: 'Product not found' })
    const price = updates.price !== undefined && updates.price !== null && updates.price !== ''
      ? parseFloat(updates.price)
      : (updates.price === null || updates.price === '' ? null : found.price)
    Object.assign(found, updates, { id: found.id, price })
    await saveCatalog(catalog)
    res.json(found)
  } catch (error) {
    console.error('❌ Error updating product:', error.message)
    res.status(500).json({ error: 'Failed to update product' })
  }
})

// DELETE /api/products/items/:itemId
app.delete('/api/products/items/:itemId', requireAdminAuth, async (req, res) => {
  try {
    const { itemId } = req.params
    const catalog = await getCatalog()
    let deleted = false
    outer: for (const type of catalog.types) {
      for (const set of type.sets) {
        const idx = set.products.findIndex(p => p.id === itemId)
        if (idx !== -1) { set.products.splice(idx, 1); deleted = true; break outer }
      }
    }
    if (!deleted) return res.status(404).json({ error: 'Product not found' })
    await saveCatalog(catalog)
    res.json({ message: 'Product deleted' })
  } catch (error) {
    console.error('❌ Error deleting product:', error.message)
    res.status(500).json({ error: 'Failed to delete product' })
  }
})

// ─── Square POS Integration (sandbox-first) ─────────────────────────────────
// This is an additive surface for validating Square POS credentials and catalog
// access before any production rollout. It does not replace the manual catalog.

app.get('/api/square/status', requireAdminAuth, async (req, res) => {
  try {
    const status = getSquareConfigurationStatus(process.env)
    res.json({
      ok: true,
      ...status,
      apiBaseUrl: status.environment === 'production'
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
        message: 'The Square integration needs SQUARE_ACCESS_TOKEN, SQUARE_APPLICATION_ID, and SQUARE_LOCATION_ID.',
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

app.get('/api/square/categories', requireAdminAuth, async (req, res) => {
  try {
    const categories = await listSquareCategories(process.env)
    res.json({ ok: true, categories })
  } catch (error) {
    console.error('❌ Square categories fetch failed:', error.message)
    res.status(502).json({ ok: false, error: 'Square categories fetch failed', message: error.message })
  }
})

app.post('/api/square/categories', requireAdminAuth, async (req, res) => {
  try {
    const { name, parentCategoryId } = req.body || {}
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' })
    }

    const category = await createSquareCategory({ name: name.trim(), parentCategoryId: parentCategoryId || null }, process.env)
    res.json({ ok: true, category })
  } catch (error) {
    console.error('❌ Square category creation failed:', error.message)
    res.status(502).json({ ok: false, error: 'Square category creation failed', message: error.message })
  }
})

app.get('/api/square/products/:itemId', requireAdminAuth, async (req, res) => {
  try {
    const item = await getSquareCatalogItem(req.params.itemId, process.env)
    res.json({ ok: true, item })
  } catch (error) {
    console.error('❌ Square product fetch failed:', error.message)
    res.status(502).json({ ok: false, error: 'Square product fetch failed', message: error.message })
  }
})

app.put('/api/square/products/:itemId', requireAdminAuth, async (req, res) => {
  try {
    const body = req.body || {}
    const touchesSku = Object.prototype.hasOwnProperty.call(body, 'sku')
      || (body.variations || []).some(variation => Object.prototype.hasOwnProperty.call(variation, 'sku'))
    if (touchesSku) {
      return res.status(400).json({ error: 'SKU cannot be edited here — it is locked to protect in-store barcode scanning' })
    }

    const updated = await updateSquareCatalogItem(req.params.itemId, body, process.env)
    res.json({ ok: true, item: updated })
  } catch (error) {
    if (error instanceof SquareVersionMismatchError) {
      return res.status(409).json({ error: error.message })
    }
    console.error('❌ Square product update failed:', error.message)
    res.status(502).json({ ok: false, error: 'Square product update failed', message: error.message })
  }
})

app.delete('/api/square/products/:itemId', requireAdminAuth, async (req, res) => {
  try {
    const result = await deleteSquareCatalogItem(req.params.itemId, process.env)
    res.json({ ok: true, deletedIds: result.deleted_object_ids || [] })
  } catch (error) {
    console.error('❌ Square product delete failed:', error.message)
    res.status(502).json({ ok: false, error: 'Square product delete failed', message: error.message })
  }
})

app.delete('/api/square/products/:itemId/variations/:variationId', requireAdminAuth, async (req, res) => {
  try {
    const result = await deleteSquareCatalogVariation(req.params.itemId, req.params.variationId, process.env)
    res.json({ ok: true, deletedIds: result.deleted_object_ids || [] })
  } catch (error) {
    console.error('❌ Square variation delete failed:', error.message)
    res.status(502).json({ ok: false, error: 'Square variation delete failed', message: error.message })
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
      const result = await uploadSquareCatalogImage(req.params.itemId, {
        buffer: req.file.buffer,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
      }, process.env)
      res.json({ ok: true, imageUrl: result.imageUrl })
    } catch (error) {
      console.error('❌ Square image upload failed:', error.message)
      res.status(502).json({ ok: false, error: 'Square image upload failed', message: error.message })
    }
  })
})

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
    res.json({ ok: true, quantity })
  } catch (error) {
    console.error('❌ Square inventory correction failed:', error.message)
    res.status(502).json({ ok: false, error: 'Square inventory correction failed', message: error.message })
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
        return res.status(400).json({ error: 'Each change requires a variationId and a non-negative quantity' })
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
    res.json({ ok: true, updatedCount: result.updatedCount })
  } catch (error) {
    console.error('❌ Square batch inventory correction failed:', error.message)
    res.status(502).json({ ok: false, error: 'Square batch inventory correction failed', message: error.message })
  }
})

app.get('/api/square/sales', requireAdminAuth, async (req, res) => {
  try {
    const to = req.query.to ? new Date(req.query.to).toISOString() : new Date().toISOString()
    const from = req.query.from
      ? new Date(req.query.from).toISOString()
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const granularity = req.query.granularity === 'week' ? 'week' : 'day'

    const report = await getSquareSalesReport({ from, to, granularity }, process.env)
    res.json(report)
  } catch (error) {
    console.error('❌ Square sales report failed:', error.message)
    res.status(502).json({ ok: false, error: 'Square sales report failed', message: error.message })
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
    res.status(503).json({ error: "Squarespace OAuth isn't configured yet", message: error.message })
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
    res.json({ success: true, message: 'Squarespace connected successfully. You can close this tab.' })
  } catch (error) {
    console.error('❌ Squarespace OAuth callback failed:', error.message)
    res.status(400).json({ success: false, error: error.message })
  }
})

// PUT /api/squarespace/products/:productId/assignment — tag a Squarespace product
// with a typeId/setId pointing into the manual catalog (or null to unassign).
app.put('/api/squarespace/products/:productId/assignment', requireAdminAuth, async (req, res) => {
  try {
    const { productId } = req.params
    const { typeId = null, setId = null } = req.body || {}

    if (typeId !== null) {
      const catalog = await getCatalog()
      const type = catalog.types.find(t => t.id === typeId)
      if (!type) {
        return res.status(400).json({ error: `Unknown typeId: ${typeId}` })
      }
      if (setId !== null) {
        const set = (type.sets || []).find(s => s.id === setId)
        if (!set) {
          return res
            .status(400)
            .json({ error: `setId "${setId}" does not belong to type "${typeId}"` })
        }
      }
    } else if (setId !== null) {
      // A setId can't be validated without a typeId to scope it to.
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
