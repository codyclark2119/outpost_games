// ─── Public Square catalog cache ─────────────────────────────────────────────
// The public Products page reads live Square inventory, but hitting Square on
// every page view would be slow for customers and needless load on the POS
// API — so results are cached and served stale-while-refreshing, same
// Redis-with-memory-fallback convention as squarespaceCache.js.
//
// Refresh cadence intentionally tracks store hours rather than a flat TTL:
// during open hours the floor is fresher (customers browsing while in/near
// the store, stock genuinely moving) at once an hour; outside open hours the
// catalog can't realistically change, so refreshes back off to once a day.

import { getSquareConfigurationStatus, getPublicSquareCatalog } from './squarePosClient.js'

const CACHE_KEY = 'outpost:square:public-catalog'
const STORE_TIMEZONE = 'America/Chicago'
const OPEN_WEEKDAYS = new Set(['Thu', 'Fri', 'Sat', 'Sun'])
const OPEN_HOUR = 17 // 5:00 PM
const CLOSE_HOUR = 22 // 10:00 PM
const OPEN_HOURS_TTL_MS = 60 * 60 * 1000 // 1 hour
const CLOSED_TTL_MS = 24 * 60 * 60 * 1000 // 1 day

const isStoreOpenNow = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: STORE_TIMEZONE,
    weekday: 'short',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date())
  const weekday = parts.find(part => part.type === 'weekday')?.value
  const hour = Number(parts.find(part => part.type === 'hour')?.value)
  if (!weekday || !OPEN_WEEKDAYS.has(weekday)) return false
  return hour >= OPEN_HOUR && hour < CLOSE_HOUR
}

const getTtlMs = () => (isStoreOpenNow() ? OPEN_HOURS_TTL_MS : CLOSED_TTL_MS)

// Injected from server.js (see initSquarePublicCatalogCache).
let redisClient = null
let isRedisConnected = () => false

let memoryCache = null // { fetchedAt, environment, itemCount, items }

let lastFetchedAt = null
let lastError = null
let itemCount = 0

let refreshInProgress = null
let warnedNotConfigured = false

export const initSquarePublicCatalogCache = ({ redisClient: client, isRedisConnected: connectedFn }) => {
  redisClient = client
  if (typeof connectedFn === 'function') isRedisConnected = connectedFn
}

const readCache = async () => {
  if (!isRedisConnected() || !redisClient) return memoryCache
  try {
    const data = await redisClient.get(CACHE_KEY)
    return data ? JSON.parse(data) : memoryCache
  } catch {
    return memoryCache
  }
}

const writeCache = async cache => {
  memoryCache = cache // write-through mirror
  if (!isRedisConnected() || !redisClient) return
  try {
    await redisClient.set(CACHE_KEY, JSON.stringify(cache))
  } catch (err) {
    console.warn('⚠️  Failed to persist Square public catalog cache to Redis:', err.message)
  }
}

// Force a synchronous full refresh from Square. Overlapping calls share one refresh.
export const refreshSquarePublicCatalog = async () => {
  if (refreshInProgress) return refreshInProgress

  refreshInProgress = (async () => {
    try {
      const cache = await getPublicSquareCatalog()
      await writeCache(cache)
      lastFetchedAt = cache.fetchedAt
      itemCount = cache.itemCount
      lastError = null
      console.log(`✅ Square public catalog cache refreshed: ${cache.itemCount} items`)
      return cache
    } catch (err) {
      lastError = err.message
      console.error('❌ Square public catalog refresh failed:', err.message)
      throw err
    } finally {
      refreshInProgress = null
    }
  })()

  return refreshInProgress
}

// Return the cached catalog, kicking off a background refresh (non-blocking)
// once the cache is older than the current (store-hours-aware) TTL. If
// there's no cache yet, do one blocking refresh so the first caller still
// gets real data.
export const getCachedPublicSquareCatalog = async () => {
  const { configured } = getSquareConfigurationStatus()
  const cache = await readCache()

  if (!cache) {
    if (configured) {
      try {
        return await refreshSquarePublicCatalog()
      } catch {
        return { fetchedAt: null, itemCount: 0, items: [] }
      }
    }
    return { fetchedAt: null, itemCount: 0, items: [] }
  }

  const age = cache.fetchedAt ? Date.now() - new Date(cache.fetchedAt).getTime() : Infinity
  if (configured && age > getTtlMs()) {
    refreshSquarePublicCatalog().catch(() => {}) // fire-and-forget background refresh
  }

  return cache
}

export const getSquarePublicCatalogStatus = () => ({
  configured: getSquareConfigurationStatus().configured,
  lastFetchedAt,
  itemCount,
  lastError,
})

// Called once on server startup. No-ops with a one-time warning if Square
// isn't configured; never throws / crashes the server.
export const bootstrapSquarePublicCatalogCache = () => {
  if (!getSquareConfigurationStatus().configured) {
    if (!warnedNotConfigured) {
      console.warn(
        '⚠️  Square isn\'t configured — public product catalog is idle until SQUARE_ACCESS_TOKEN/SQUARE_APPLICATION_ID (or sandbox equivalents) are set.'
      )
      warnedNotConfigured = true
    }
    return
  }
  console.log('🔄 Square configured — running initial public catalog refresh...')
  refreshSquarePublicCatalog().catch(() => {}) // failure is already logged inside refreshSquarePublicCatalog
}
