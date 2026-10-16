import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'

import { errorHandler, AppError } from './middleware/errorHandler.js'
import { createRedisStore } from './services/redis.js'
import { initAuth } from './auth.js'
import { initInventoryExport, startInventoryExportScheduler } from './inventoryExport.js'
import {
  initSquarePublicCatalogCache,
  bootstrapSquarePublicCatalogCache,
} from './squarePublicCatalogCache.js'
import { startWarmWindowSelfPing } from './warmWindow.js'
import { mountAuth } from './routes/auth.js'
import { mountRecords } from './routes/records.js'
import { mountSquare } from './routes/square.js'
import { mountInventoryExport } from './routes/inventoryExport.js'

process.on('uncaughtException', error => {
  console.error('❌ UNCAUGHT EXCEPTION:', error)
  process.exit(1)
})
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION at:', promise, 'reason:', reason)
  process.exit(1)
})

// Load the repo-root .env explicitly — dotenv's default lookup is relative to
// process.cwd(), which is api/ under the documented `cd api && npm run dev`
// workflow, so it silently found nothing there. In production, real platform
// env vars (Fly secrets) always win regardless, since dotenv never overrides
// an already-set process.env value.
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') })

const PORT = process.env.API_PORT || 3001
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379'
console.log(`🚀 Starting API (Node ${process.version}, ${process.env.NODE_ENV || 'development'})`)
console.log('📡 Redis URL configured:', REDIS_URL.replace(/:[^:@]+@/, ':****@'))

const app = express()

// Requests arrive through two trusted proxy hops in production — Cloudflare's edge,
// then Fly.io's own internal proxy — both of which append to X-Forwarded-For. Without
// this, Express's default `trust proxy: false` makes express-rate-limit reject every
// request outright (it refuses to trust an X-Forwarded-For header it wasn't told to
// expect), and req.ip would resolve to the last proxy rather than the real client.
app.set('trust proxy', 2)

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

// Rate limiting is applied to the login route only (checkout has its own, in
// routes/onlineSales.js) — there is deliberately no global limiter. Only failed
// attempts count (skipSuccessfulRequests), so a legitimate admin never gets
// locked out by their own successful logins.
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

// One Redis connection, shared by every module that stores anything.
const store = createRedisStore(REDIS_URL)
initAuth(store)
initInventoryExport(store)
initSquarePublicCatalogCache(store)

// Non-blocking: routes answer from the memory fallback (or 503 in production)
// until Redis is up. Background jobs start once the connection state is settled.
store.connect().then(() => {
  bootstrapSquarePublicCatalogCache()
  // Checks hourly for the 1st of the month (store-local time); no-ops until
  // GMAIL_USER/GMAIL_APP_PASSWORD are configured.
  startInventoryExportScheduler()
})

app.get('/api/health', (req, res) => {
  const connected = store.isRedisConnected()
  res.json({
    status: connected ? 'ok' : 'degraded',
    message: 'API is running',
    redis: connected
      ? 'connected'
      : store.persistent
        ? 'unavailable'
        : 'disconnected (development memory fallback)',
    persistent: connected,
    timestamp: new Date().toISOString(),
  })
})

mountAuth(app, loginRateLimiter)
mountRecords(app, store)
mountSquare(app, store)
mountInventoryExport(app)

startWarmWindowSelfPing()

app.use(errorHandler)

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API server running on port ${PORT}`)
})

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server')
  const timeout = setTimeout(() => process.exit(1), 10000).unref()
  server.close(async () => {
    await store.close()
    clearTimeout(timeout)
    process.exit(0)
  })
})
