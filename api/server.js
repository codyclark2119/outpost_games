import storeConfig from './storeConfig.json' with { type: 'json' }
import { mountRecords } from './routes/records.js'
import { errorHandler, AppError } from './middleware/errorHandler.js'
import { requiresPersistence } from './services/persistence.js'
import { mountSquarespace } from './routes/squarespace.js'
import { mountInventoryExport } from './routes/inventoryExport.js'
import { mountSquare } from './routes/square.js'
import { mountMarketingPosters } from './routes/marketingPosters.js'
import { mountAuth } from './routes/auth.js'
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
import { initSquarespaceCache, bootstrapSquarespaceCache } from './squarespaceCache.js'
import { initSquarespaceOAuth } from './squarespaceOAuth.js'

import {
  initSquarePublicCatalogCache,
  bootstrapSquarePublicCatalogCache,
} from './squarePublicCatalogCache.js'
import { initAuth } from './auth.js'
import { initInventoryExport, startInventoryExportScheduler } from './inventoryExport.js'

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
      callback(new AppError(403, 'Origin not allowed'))
    },
    credentials: true,
  })
)
app.use(express.json())
app.use(cookieParser())

console.log('✅ Middleware configured')

// Rate limiting is applied to the login route only — there is deliberately no
// general/global limiter on this app, so don't read this block as "the strict
// one" of a pair. A single-admin password login is the one endpoint worth
// throttling, and only failed attempts count against it (skipSuccessfulRequests)
// so a legitimate admin never gets locked out by their own successful logins.
const loginRateLimiter = rateLimit({
  windowMs:
    parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW, 10) ||
    parseInt(process.env.RATE_LIMIT_WINDOW, 10) ||
    15 * 60 * 1000,
  limit: parseInt(process.env.LOGIN_RATE_LIMIT_MAX, 10) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
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

redisClient.on('error', err => {
  console.error('Redis Client Error:', err.message)
  if (!redisClient.isReady) redisConnected = false
})
redisClient.on('ready', () => {
  redisConnected = true
})
redisClient.on('end', () => {
  redisConnected = false
})
redisClient.on('connect', () => console.log('✅ Connected to Redis'))
redisClient.on('reconnecting', () => console.log('🔄 Reconnecting to Redis...'))

let redisConnected = false
const requireProductionPersistence = requiresPersistence()

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
  } catch (err) {
    redisConnected = false
    console.warn(
      requireProductionPersistence
        ? '⚠️  Redis unavailable: production persistence is degraded:'
        : '⚠️  Redis unavailable: development memory fallback is active:',
      err.message
    )
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: redisConnected ? 'ok' : 'degraded',
    message: 'API is running',
    redis: redisConnected
      ? 'connected'
      : requireProductionPersistence
        ? 'unavailable'
        : 'disconnected (development memory fallback)',
    persistent: redisConnected,
    timestamp: new Date().toISOString(),
  })
})

mountAuth(app, loginRateLimiter)

mountMarketingPosters(app)

mountRecords(app, {
  redisClient,
  isRedisConnected: () => redisConnected,
  persistent: requireProductionPersistence,
})

mountSquare(app, {
  redisClient,
  isRedisConnected: () => redisConnected,
  requireProductionPersistence,
})

mountInventoryExport(app)

mountSquarespace(app)

// ─── Warm-hours self-ping (belt-and-suspenders) ─────────────────────────────
// The .github/workflows/warm-hours.yml cron is the primary mechanism that
// guarantees the machine is awake for the noon-midnight America/Chicago
// window (see that file for the full DST-handling writeup). This is a
// fallback that keeps it warm for the *rest* of the window even if that
// workflow run fails or is delayed.
//
// This has to hit the machine through Fly's real public endpoint to count as
// activity — Fly's auto-stop watches for connections at its edge PROXY, not
// inside the process, so a plain in-process timer or a loopback fetch to
// 127.0.0.1 would be invisible to it and wouldn't actually prevent idle-stop.
// Off by default (WARM_WINDOW_SELF_PING unset) since the cron job above is
// sufficient on its own; this only adds redundancy.
const WARM_WINDOW_TIMEZONE = storeConfig.timeZone
const WARM_WINDOW_START_HOUR = 12 // noon — keep in sync with the cron schedule in warm-hours.yml
const SELF_PING_INTERVAL_MS = 2 * 60 * 1000 // well under Fly's ~5 min idle-stop timeout

const isInsideWarmWindow = () => {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: WARM_WINDOW_TIMEZONE,
      hour: 'numeric',
      hour12: false,
    }).format(new Date())
  )
  return hour >= WARM_WINDOW_START_HOUR
}

if (process.env.WARM_WINDOW_SELF_PING === 'true') {
  const selfPingUrl =
    process.env.WARM_WINDOW_SELF_PING_URL ||
    (process.env.FLY_APP_NAME ? `https://${process.env.FLY_APP_NAME}.fly.dev/api/health` : null)

  if (!selfPingUrl) {
    console.warn(
      '⚠️  WARM_WINDOW_SELF_PING is set but no target URL could be determined (need FLY_APP_NAME or WARM_WINDOW_SELF_PING_URL) — skipping'
    )
  } else {
    setInterval(() => {
      if (!isInsideWarmWindow()) return
      // Best-effort — a failed ping just means the next one tries again in
      // SELF_PING_INTERVAL_MS; nothing here should ever crash the process.
      fetch(selfPingUrl).catch(() => {})
    }, SELF_PING_INTERVAL_MS)
    console.log(
      `🔥 Warm-window self-ping enabled — pinging ${selfPingUrl} every ${SELF_PING_INTERVAL_MS / 1000}s from ${WARM_WINDOW_START_HOUR}:00 Central`
    )
  }
}

app.use(errorHandler)

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API server running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`)
  if (!redisConnected) {
    console.log('⚠️  Running without Redis - data will not persist across restarts')
  }
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server')
  const timeout = setTimeout(() => process.exit(1), 10000).unref()
  server.close(async () => {
    if (redisClient.isOpen) await redisClient.quit().catch(console.error)
    clearTimeout(timeout)
    process.exit(0)
  })
})
