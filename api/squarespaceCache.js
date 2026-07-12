// ─── Squarespace cache + merge orchestration ─────────────────────────────────
// Fetches the read-only Squarespace store (products + inventory), merges them
// into normalized entries with computed stock/visibility, and caches the result.
//
// Mirrors the getCatalog/saveCatalog Redis-with-in-memory-fallback convention in
// server.js: reads/writes go to Redis when connected, else to module-level vars.
// The shared Redis client + a live "connected" flag are injected via
// initSquarespaceCache() so we reuse server.js's single connection.

import { listAllProducts, listAllInventory, isConfigured } from './squarespaceClient.js'
import { SquarespaceNotConfiguredError, SquarespaceNotAuthorizedError } from './squarespaceErrors.js'

const CACHE_KEY = 'outpost:squarespace:cache'
const ASSIGNMENTS_KEY = 'outpost:squarespace:assignments'
const DEFAULT_TTL_MS = 15 * 60 * 1000 // 15 minutes

const getTtlMs = () => {
  const raw = parseInt(process.env.SQUARESPACE_CACHE_TTL_MS, 10)
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TTL_MS
}

// Injected from server.js (see initSquarespaceCache).
let redisClient = null
let isRedisConnected = () => false

// In-memory fallbacks (used when Redis is unreachable). memoryCache is also kept
// as a write-through mirror so an initial refresh done before Redis connects is
// never lost.
let memoryCache = null // { fetchedAt, products }
let memoryAssignments = {} // { [squarespaceProductId]: { typeId, setId } }

// Lightweight status for the /status endpoint.
let lastFetchedAt = null
let lastError = null
let productCount = 0

// Coalesces overlapping refreshes (TTL trigger + manual endpoint + bootstrap).
let refreshInProgress = null
let warnedNotConfigured = false

// Wire up the shared Redis client + a getter for the live connection flag.
// The flag must be a function: server.js flips `redisConnected` true only after
// an async connect, so capturing the boolean value here would freeze it at false.
export const initSquarespaceCache = ({ redisClient: client, isRedisConnected: connectedFn }) => {
  redisClient = client
  if (typeof connectedFn === 'function') isRedisConnected = connectedFn
}

// ─── Redis-with-memory-fallback helpers ──────────────────────────────────────

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
    console.warn('⚠️  Failed to persist Squarespace cache to Redis:', err.message)
  }
}

const readAssignments = async () => {
  if (!isRedisConnected() || !redisClient) return memoryAssignments
  try {
    const data = await redisClient.get(ASSIGNMENTS_KEY)
    return data ? JSON.parse(data) : memoryAssignments
  } catch {
    return memoryAssignments
  }
}

const writeAssignments = async assignments => {
  memoryAssignments = assignments // write-through mirror
  if (!isRedisConnected() || !redisClient) return
  try {
    await redisClient.set(ASSIGNMENTS_KEY, JSON.stringify(assignments))
  } catch (err) {
    console.warn('⚠️  Failed to persist Squarespace assignments to Redis:', err.message)
  }
}

// ─── Pure merge logic ────────────────────────────────────────────────────────

// Merge raw products + inventory into normalized entries. Pure & side-effect free
// so it can be reviewed/tested in isolation.
//
// InventoryItem has NO productId — the only link to a product is variantId
// (primary) or sku (fallback) against a variant embedded in the product. We build
// O(1) lookup maps rather than nest-looping products × inventory.
export const mergeProductsWithInventory = (products, inventory) => {
  const byVariantId = new Map()
  const bySku = new Map()
  for (const row of Array.isArray(inventory) ? inventory : []) {
    if (!row) continue
    if (row.variantId != null) byVariantId.set(String(row.variantId), row)
    if (row.sku) bySku.set(String(row.sku), row)
  }

  const lookupInventory = variant => {
    if (!variant) return null
    if (variant.id != null && byVariantId.has(String(variant.id))) {
      return byVariantId.get(String(variant.id))
    }
    if (variant.sku && bySku.has(String(variant.sku))) {
      return bySku.get(String(variant.sku))
    }
    return null
  }

  return (Array.isArray(products) ? products : []).map(product => {
    const isDigital = product?.type === 'DIGITAL'
    // Code defensively: variants sub-schema isn't fully confirmable and DIGITAL
    // products may have no variants array at all.
    const rawVariants = Array.isArray(product?.variants) ? product.variants : []

    let totalQuantity = 0
    let anyUnlimited = false

    const variants = rawVariants.map(variant => {
      const inv = lookupInventory(variant)
      const isUnlimited = inv ? Boolean(inv.isUnlimited) : false
      const quantity = inv && Number.isFinite(inv.quantity) ? inv.quantity : 0
      if (isUnlimited) anyUnlimited = true
      else totalQuantity += quantity
      return { ...variant, quantity, isUnlimited }
    })

    // In stock if any variant is unlimited or has qty > 0 — or the product is
    // DIGITAL (no physical inventory concept applies).
    const inStock = isDigital || anyUnlimited || totalQuantity > 0
    // Visible only if Squarespace's own storefront flag is true AND it's in stock.
    const visible = Boolean(product?.isVisible) && inStock

    return { ...product, variants, totalQuantity, inStock, visible }
  })
}

// ─── Refresh + read ──────────────────────────────────────────────────────────

// Force a synchronous full refresh: fetch all products + inventory concurrently,
// merge, persist to cache, and update status. Overlapping calls share one refresh.
export const refreshSquarespaceCatalog = async () => {
  if (!isConfigured()) throw new SquarespaceNotConfiguredError()

  if (refreshInProgress) return refreshInProgress

  refreshInProgress = (async () => {
    try {
      const [products, inventory] = await Promise.all([listAllProducts(), listAllInventory()])
      const merged = mergeProductsWithInventory(products, inventory)
      const cache = { fetchedAt: new Date().toISOString(), products: merged }
      await writeCache(cache)
      lastFetchedAt = cache.fetchedAt
      productCount = merged.length
      lastError = null
      console.log(`✅ Squarespace cache refreshed: ${merged.length} products`)
      return cache
    } catch (err) {
      lastError = err.message
      if (err instanceof SquarespaceNotAuthorizedError) {
        // Expected state right after setting OAuth client env vars but before
        // the one-time human authorize step — not a real failure.
        console.warn('⚠️  Squarespace refresh skipped —', err.message)
      } else {
        console.error('❌ Squarespace refresh failed:', err.message)
      }
      throw err
    } finally {
      refreshInProgress = null
    }
  })()

  return refreshInProgress
}

// Return the cached catalog, kicking off a background refresh (non-blocking) when
// the cache is older than the TTL. If there's no cache yet, do one blocking
// refresh so the first caller still gets real data (coalesced with any in-flight).
export const getSquarespaceCatalog = async () => {
  const cache = await readCache()

  if (!cache) {
    if (isConfigured()) {
      try {
        return await refreshSquarespaceCatalog()
      } catch {
        return { fetchedAt: null, products: [] }
      }
    }
    return { fetchedAt: null, products: [] }
  }

  const age = cache.fetchedAt ? Date.now() - new Date(cache.fetchedAt).getTime() : Infinity
  if (isConfigured() && age > getTtlMs()) {
    refreshSquarespaceCatalog().catch(() => {}) // fire-and-forget background refresh
  }

  return cache
}

// ─── Assignments (map Squarespace products into the manual catalog) ───────────

export const getAllAssignments = async () => readAssignments()

// Object.hasOwn guard: productId is attacker-influenced (comes straight from
// a URL path param) and assignments is a plain object, so a productId of
// exactly "__proto__" would otherwise resolve via the prototype chain to
// Object.prototype itself (a truthy object) instead of falling through to
// the intended default.
export const getAssignment = async productId => {
  const assignments = await readAssignments()
  return Object.hasOwn(assignments, productId)
    ? assignments[productId]
    : { typeId: null, setId: null }
}

export const setAssignment = async (productId, { typeId = null, setId = null } = {}) => {
  const assignments = await readAssignments()
  const next = { ...assignments, [productId]: { typeId: typeId ?? null, setId: setId ?? null } }
  await writeAssignments(next)
  return next[productId]
}

// ─── Status + startup ────────────────────────────────────────────────────────

export const getSquarespaceStatus = () => ({
  configured: isConfigured(),
  lastFetchedAt,
  productCount,
  lastError,
})

// Called once on server startup. Kicks off an initial refresh only when an API
// key is configured; otherwise logs a single warning and does nothing. Never
// throws / crashes the server.
export const bootstrapSquarespaceCache = () => {
  if (!isConfigured()) {
    if (!warnedNotConfigured) {
      console.warn(
        '⚠️  Squarespace isn\'t configured — set SQUARESPACE_API_KEY, or SQUARESPACE_CLIENT_ID/SQUARESPACE_CLIENT_SECRET/SQUARESPACE_REDIRECT_URI for OAuth. Integration is idle (manual catalog unaffected).'
      )
      warnedNotConfigured = true
    }
    return
  }
  console.log('🔄 Squarespace configured — running initial catalog refresh...')
  refreshSquarespaceCatalog().catch(() => {}) // failure is already logged inside refreshSquarespaceCatalog
}
