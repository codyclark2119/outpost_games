import storeConfig from '../storeConfig.json' with { type: 'json' }
import { AppError } from '../middleware/errorHandler.js'
import { createValue } from './persistence.js'
// ─── Public Square catalog cache ─────────────────────────────────────────────
// The public Products page reads live Square inventory, but hitting Square on
// every page view would be slow for customers and needless load on the POS
// API — so results are cached and served stale-while-refreshing, kept in the
// shared Redis store (services/redis.js) with a memory fallback.
//
// Refresh cadence intentionally tracks store hours rather than a flat TTL:
// during open hours the floor is fresher (customers browsing while in/near
// the store, stock genuinely moving) at once an hour; outside open hours the
// catalog can't realistically change, so refreshes back off to once a day.

import { getSquareConfigurationStatus, getPublicSquareCatalog } from '../square/index.js'

const CACHE_KEY = 'outpost:square:public-catalog'
const STORE_TIMEZONE = storeConfig.timeZone
// Weekday ("Tue") -> ["17:30", "22:00"] in store-local time; a missing day is
// closed. Shared with the frontend's open/closed status (src/config/storeInfo.ts)
// so a change of hours is one edit to storeConfig.json.
const OPEN_HOURS = storeConfig.openHours
const toMinutes = hhmm => {
  const [hour, minute] = hhmm.split(':').map(Number)
  return hour * 60 + minute
}
const OPEN_HOURS_TTL_MS = 60 * 60 * 1000 // 1 hour
const CLOSED_TTL_MS = 24 * 60 * 60 * 1000 // 1 day

const isStoreOpenNow = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: STORE_TIMEZONE,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(new Date())
  const weekday = parts.find(part => part.type === 'weekday')?.value
  // ICU renders midnight as hour 24 with hour12:false — normalize so a
  // just-after-midnight check reads as 0, not as a past-closing 24.
  const rawHour = Number(parts.find(part => part.type === 'hour')?.value)
  const hour = rawHour === 24 ? 0 : rawHour
  const minute = Number(parts.find(part => part.type === 'minute')?.value)
  const hours = weekday ? OPEN_HOURS[weekday] : null
  if (!hours) return false
  const minutesFromMidnight = hour * 60 + minute
  return minutesFromMidnight >= toMinutes(hours[0]) && minutesFromMidnight < toMinutes(hours[1])
}

const getTtlMs = () => (isStoreOpenNow() ? OPEN_HOURS_TTL_MS : CLOSED_TTL_MS)

// Injected from server.js (see initSquarePublicCatalogCache). Not required:
// without Redis the cache simply lives in this process's memory.
let cacheValue = createValue({ isRedisConnected: () => false }, CACHE_KEY, { required: false })

let refreshInProgress = null
let warnedNotConfigured = false

export const initSquarePublicCatalogCache = store => {
  cacheValue = createValue(store, CACHE_KEY, { required: false })
}

const readCache = async () => {
  const raw = await cacheValue.get()
  try {
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const writeCache = cache => cacheValue.set(JSON.stringify(cache))

// Force a synchronous full refresh from Square. Overlapping calls share one refresh.
export const refreshSquarePublicCatalog = async () => {
  if (refreshInProgress) return refreshInProgress

  refreshInProgress = (async () => {
    try {
      const cache = await getPublicSquareCatalog()
      await writeCache(cache)
      console.log(`✅ Square public catalog cache refreshed: ${cache.itemCount} items`)
      return cache
    } catch (err) {
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
      } catch (cause) {
        throw new AppError(503, 'Products are temporarily unavailable', { cause })
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

// Called once on server startup. No-ops with a one-time warning if Square
// isn't configured; never throws / crashes the server.
export const bootstrapSquarePublicCatalogCache = () => {
  if (!getSquareConfigurationStatus().configured) {
    if (!warnedNotConfigured) {
      console.warn(
        "⚠️  Square isn't configured — public product catalog is idle until SQUARE_ACCESS_TOKEN/SQUARE_APPLICATION_ID (or sandbox equivalents) are set."
      )
      warnedNotConfigured = true
    }
    return
  }
  console.log('🔄 Square configured — running initial public catalog refresh...')
  refreshSquarePublicCatalog().catch(() => {}) // failure is already logged inside refreshSquarePublicCatalog
}
