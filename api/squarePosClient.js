import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const SANDBOX_BASE_URL = 'https://connect.squareupsandbox.com'
const PRODUCTION_BASE_URL = 'https://connect.squareup.com'
const PLACEHOLDER_VALUES = new Set(['YOUR_LOCATION_ID', 'YOUR_ACCESS_TOKEN', 'YOUR_APPLICATION_ID', 'YOUR_APP_ID', 'YOUR_TOKEN'])
const CATALOG_PAGE_SAFETY_CAP = 200
const INVENTORY_BATCH_SIZE = 100
// Square's confirmed real limits for these three batch endpoints (developer.squareup.com).
const CATALOG_UPSERT_BATCH_SIZE = 1000 // objects per batch; Square also caps at 10,000 objects/request total
const CATALOG_DELETE_BATCH_SIZE = 200 // object_ids per /v2/catalog/batch-delete call
const CATALOG_RETRIEVE_BATCH_SIZE = 1000 // object_ids per /v2/catalog/batch-retrieve call

// Square's Catalog API has no built-in "cost of goods" field on a variation —
// confirmed against a live account, not just docs (no such field appears on
// item_variation_data). A CatalogCustomAttributeDefinition (type NUMBER,
// scoped to ITEM_VARIATION, name "Unit Cost") was created once for this via
// a direct API call — see README's "Square POS Catalog Admin" section — and
// is referenced here purely by its `key`, which Square resolves to the
// definition automatically on writes (no definition id needed, confirmed
// live: a write with only `key`+`type`+`number_value` round-trips fine).
const COST_ATTRIBUTE_KEY = 'outpost_unit_cost'

// Reads the unit cost off a raw ITEM_VARIATION catalog object (present at the
// object's top level, both from bulk /v2/catalog/list and single-object
// retrieve — confirmed live on this account). Square stores NUMBER custom
// attributes as a string; returns cents (integer) or null if never set.
const readCostCents = rawVariationObject => {
  const raw = rawVariationObject.custom_attribute_values?.[COST_ATTRIBUTE_KEY]?.number_value
  if (raw == null) return null
  const dollars = Number(raw)
  return Number.isFinite(dollars) ? Math.round(dollars * 100) : null
}

// Builds the custom_attribute_values map to upsert for a given cost — pass
// costCents: null to clear it (an empty map entirely omits the key, which
// Square treats as "not set" the same as it never having been written).
const buildCostAttributeValues = (existing, costCents) => {
  const next = { ...(existing || {}) }
  if (costCents === null) {
    delete next[COST_ATTRIBUTE_KEY]
  } else {
    next[COST_ATTRIBUTE_KEY] = {
      key: COST_ATTRIBUTE_KEY,
      type: 'NUMBER',
      number_value: (costCents / 100).toFixed(2),
    }
  }
  return next
}

// Square's own `ecom_visibility` field has no effect on this site or the
// physical POS (confirmed live — this account has no online-store channel
// configured, so Square silently normalizes whatever is written back to
// UNAVAILABLE on read) — it can't be used to hide an item from the public
// catalog. `sellable` DOES affect the public catalog, but it also blocks the
// item from being rung up at the in-store register, which is a much bigger
// hammer than "just hide it from the website." This is a second
// CatalogCustomAttributeDefinition (type BOOLEAN, scoped to ITEM, key
// `outpost_hide_from_web`) created once the same way `outpost_unit_cost` was
// (see README's "Square POS Catalog Admin" section) — a durable, independent
// flag purely for this site's own public-catalog filtering.
const HIDE_FROM_WEB_ATTRIBUTE_KEY = 'outpost_hide_from_web'

// Reads the flag off a raw ITEM catalog object (item-level, not per-variation
// — hiding an item from the site is an all-or-nothing decision for the whole
// item, matching how the admin UI's Visibility control already worked).
const readHiddenFromWeb = rawItemObject =>
  rawItemObject.custom_attribute_values?.[HIDE_FROM_WEB_ATTRIBUTE_KEY]?.boolean_value === true

// hidden: false removes the attribute value entirely rather than writing an
// explicit `false` — same "omitting means not set" convention as cost above.
const buildHiddenFromWebAttributeValues = (existing, hidden) => {
  const next = { ...(existing || {}) }
  if (!hidden) {
    delete next[HIDE_FROM_WEB_ATTRIBUTE_KEY]
  } else {
    next[HIDE_FROM_WEB_ATTRIBUTE_KEY] = {
      key: HIDE_FROM_WEB_ATTRIBUTE_KEY,
      type: 'BOOLEAN',
      boolean_value: true,
    }
  }
  return next
}

// A third CatalogCustomAttributeDefinition (type STRING — Square has no native
// DATE type; confirmed against the live CatalogCustomAttributeDefinitionType
// enum, which only has STRING/BOOLEAN/NUMBER/SELECTION — created the same way
// as the two above, key `outpost_released_at`, scoped to ITEM). Stores an ISO
// date (YYYY-MM-DD) staff set to mark when a product actually became
// available. This exists because Square's own `created_at` on an ITEM reflects
// whenever that catalog entry was last created/touched in Square — bulk
// imports and catalog cleanups bump it without the product actually being new
// — so it's unreliable as a "newest arrivals" signal on its own. The public
// catalog's default sort (getPublicSquareCatalog, below) uses this value when
// set, falling back to itemCreatedAt when it isn't.
const RELEASED_AT_ATTRIBUTE_KEY = 'outpost_released_at'

const readReleasedAt = rawItemObject =>
  rawItemObject.custom_attribute_values?.[RELEASED_AT_ATTRIBUTE_KEY]?.string_value || null

// releasedAt: null/'' removes the attribute entirely (falls back to
// itemCreatedAt again), same "omitting means not set" convention as above.
const buildReleasedAtAttributeValues = (existing, releasedAt) => {
  const next = { ...(existing || {}) }
  if (!releasedAt) {
    delete next[RELEASED_AT_ATTRIBUTE_KEY]
  } else {
    next[RELEASED_AT_ATTRIBUTE_KEY] = {
      key: RELEASED_AT_ATTRIBUTE_KEY,
      type: 'STRING',
      string_value: releasedAt,
    }
  }
  return next
}

const normalizeEnvValue = value => {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (PLACEHOLDER_VALUES.has(trimmed.toUpperCase()) || /^YOUR_/i.test(trimmed)) {
    return ''
  }
  return trimmed
}

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(currentDir, '..', '.env')

const parseEnvFile = envFilePath => {
  if (!fs.existsSync(envFilePath)) return {}

  const values = {}
  for (const line of fs.readFileSync(envFilePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) continue
    const key = trimmed.slice(0, separatorIndex).trim()
    const rawValue = trimmed.slice(separatorIndex + 1).trim()
    const value = rawValue.replace(/^['"]|['"]$/g, '')
    values[key] = value
  }

  return values
}

export const loadSquareEnvironment = () => {
  if (globalThis.__outpostSquareEnvLoaded) return process.env

  const parsedEnv = parseEnvFile(envPath)
  for (const [key, value] of Object.entries(parsedEnv)) {
    if (key.startsWith('SQUARE_') || key === 'NODE_ENV') {
      process.env[key] = value
    }
  }

  globalThis.__outpostSquareEnvLoaded = true
  return process.env
}

loadSquareEnvironment()

export const resolveSquareEnvironment = (env = process.env) => {
  const value = (env.SQUARE_ENV || '').toLowerCase().trim()
  if (value === 'production' || value === 'prod' || value === 'productions') return 'production'
  return 'sandbox'
}

export const buildSquareApiUrl = (path, environment = resolveSquareEnvironment()) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const baseUrl = environment === 'production' ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL
  return `${baseUrl}${normalizedPath}`
}

// SQUARE_ENV picks which pair of credentials is actually valid — a production
// access token is rejected outright by the sandbox host and vice versa — so
// every credential lookup must go through here rather than reading
// SQUARE_ACCESS_TOKEN/SQUARE_APPLICATION_ID/SQUARE_LOCATION_ID directly.
export const resolveSquareCredentials = (env = process.env) => {
  const environment = resolveSquareEnvironment(env)
  const isProduction = environment === 'production'

  return {
    environment,
    accessToken: normalizeEnvValue(isProduction ? env.SQUARE_ACCESS_TOKEN : env.SQUARE_SANDBOX_ACCESS_TOKEN),
    applicationId: normalizeEnvValue(isProduction ? env.SQUARE_APPLICATION_ID : env.SQUARE_SANDBOX_APPLICATION_ID) || null,
    locationId: normalizeEnvValue(isProduction ? env.SQUARE_LOCATION_ID : (env.SQUARE_SANDBOX_LOCATION_ID || env.SQUARE_LOCATION_ID)) || null,
  }
}

export const createSquarePosClient = ({
  accessToken,
  environment,
  applicationId,
  locationId,
} = {}) => {
  loadSquareEnvironment()
  const envOverride = environment ? { ...process.env, SQUARE_ENV: environment } : process.env
  const fallback = resolveSquareCredentials(envOverride)

  const token = normalizeEnvValue(accessToken) || fallback.accessToken
  if (!token) {
    throw new Error('Square access token is required')
  }

  const resolvedEnvironment = fallback.environment

  return {
    environment: resolvedEnvironment,
    baseUrl: resolvedEnvironment === 'production' ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    applicationId: normalizeEnvValue(applicationId) || fallback.applicationId,
    locationId: normalizeEnvValue(locationId) || fallback.locationId,
    async request(path, { method = 'GET', body } = {}) {
      const url = buildSquareApiUrl(path, resolvedEnvironment)
      const response = await fetch(url, {
        method,
        headers: this.headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        const error = new Error(payload.message || payload.errors?.[0]?.detail || `Square request failed with ${response.status}`)
        error.status = response.status
        error.squareErrors = payload.errors || []
        throw error
      }

      return payload
    },
  }
}

export class SquareVersionMismatchError extends Error {
  constructor(itemId) {
    super(`Square catalog object ${itemId} was modified elsewhere — refresh and try again`)
    this.name = 'SquareVersionMismatchError'
    this.itemId = itemId
  }
}

const isVersionMismatch = error =>
  (error.squareErrors || []).some(e => e.code === 'VERSION_MISMATCH')

// Every exported function below builds its client through here so credential
// resolution always follows SQUARE_ENV via resolveSquareCredentials.
const clientFromEnv = (env = process.env) => {
  loadSquareEnvironment()
  return createSquarePosClient(resolveSquareCredentials(env))
}

export const getSquareConfigurationStatus = (env = process.env) => {
  loadSquareEnvironment()
  const { environment, accessToken, applicationId, locationId } = resolveSquareCredentials(env)
  const envPrefix = environment === 'production' ? 'SQUARE_' : 'SQUARE_SANDBOX_'

  return {
    configured: Boolean(accessToken && applicationId),
    environment,
    hasAccessToken: Boolean(accessToken),
    hasApplicationId: Boolean(applicationId),
    hasLocationId: Boolean(locationId),
    readyForValidation: Boolean(accessToken && applicationId),
    missingFields: [
      !accessToken ? `${envPrefix}ACCESS_TOKEN` : null,
      !applicationId ? `${envPrefix}APPLICATION_ID` : null,
      !locationId ? `${envPrefix}LOCATION_ID` : null,
    ].filter(Boolean),
  }
}

export const testSquareConnection = async (env = process.env) => {
  const client = clientFromEnv(env)
  const payload = await client.request('/v2/locations')
  return {
    ok: true,
    environment: client.environment,
    locationCount: payload.locations?.length || 0,
    locations: (payload.locations || []).slice(0, 5).map(location => ({
      id: location.id,
      name: location.name,
      status: location.status,
    })),
  }
}

export const listSquareCatalogItems = async (env = process.env) => {
  const client = clientFromEnv(env)

  const variations = []
  const imagesById = new Map()
  let cursor
  let page = 0

  do {
    // IMAGE is requested alongside ITEM in the same paginated call so bulk
    // reads (stock report, public catalog) never need a per-item image fetch.
    const query = new URLSearchParams({ types: 'ITEM,IMAGE' })
    if (cursor) query.set('cursor', cursor)

    const payload = await client.request(`/v2/catalog/list?${query.toString()}`)

    for (const object of payload.objects || []) {
      if (object.type === 'IMAGE') {
        imagesById.set(object.id, object.image_data?.url || null)
        continue
      }

      const itemData = object.item_data
      if (!itemData) continue

      const categoryIds = (itemData.categories || []).map(category => category.id)
      const itemImageId = itemData.image_ids?.[0] || null
      const hiddenFromWeb = readHiddenFromWeb(object)

      for (const variation of itemData.variations || []) {
        const variationData = variation.item_variation_data || {}
        // A variation's own image (e.g. "Foil Enhanced" needing its own photo)
        // takes priority; falling back to the item's shared group photo keeps
        // every variation showing *something* for the common case where only
        // one representative photo exists for the whole item.
        const primaryImageId = variationData.image_ids?.[0] || itemImageId
        variations.push({
          id: variation.id,
          itemId: object.id,
          name: itemData.name || null,
          variationName: variationData.name || null,
          sku: variationData.sku || null,
          priceCents: variationData.price_money?.amount ?? null,
          currency: variationData.price_money?.currency ?? null,
          trackInventory: Boolean(variationData.track_inventory),
          sellable: variationData.sellable !== false,
          presentAtAllLocations: object.present_at_all_locations || false,
          categoryIds,
          primaryImageId,
          costCents: readCostCents(variation),
          hiddenFromWeb,
          releasedAt: readReleasedAt(object),
          itemCreatedAt: object.created_at || null,
        })
      }
    }

    cursor = payload.cursor
    page += 1
  } while (cursor && page < CATALOG_PAGE_SAFETY_CAP)

  // Resolved as a second pass rather than inline — an item can be paginated
  // before the IMAGE object it references, so imagesById isn't complete
  // until the whole list has been walked.
  for (const variation of variations) {
    variation.imageUrl = variation.primaryImageId
      ? imagesById.get(variation.primaryImageId) || null
      : null
  }

  return variations
}

export const listSquareInventory = async (env = process.env, { catalogObjectIds = [], locationIds = [] } = {}) => {
  const client = clientFromEnv(env)

  const resolvedLocationIds = locationIds.length ? locationIds : (client.locationId ? [client.locationId] : [])
  if (!catalogObjectIds.length || !resolvedLocationIds.length) return []

  const counts = []
  for (let i = 0; i < catalogObjectIds.length; i += INVENTORY_BATCH_SIZE) {
    const batch = catalogObjectIds.slice(i, i + INVENTORY_BATCH_SIZE)
    const payload = await client.request('/v2/inventory/counts/batch-retrieve', {
      method: 'POST',
      body: {
        catalog_object_ids: batch,
        location_ids: resolvedLocationIds,
      },
    })
    counts.push(...(payload.counts || []))
  }

  return counts
}

export const getSquareInventoryReport = async (env = process.env) => {
  loadSquareEnvironment()
  const variations = await listSquareCatalogItems(env)
  const locationId = resolveSquareCredentials(env).locationId
  const trackedVariations = variations.filter(variation => variation.trackInventory)

  const [counts, { topOf }] = await Promise.all([
    locationId
      ? listSquareInventory(env, {
          catalogObjectIds: trackedVariations.map(variation => variation.id),
          locationIds: [locationId],
        })
      : Promise.resolve([]),
    resolveTopLevelCategoryMap(env),
  ])
  const countByVariationId = new Map(counts.map(count => [count.catalog_object_id, count]))

  const items = variations.map(variation => {
    const count = countByVariationId.get(variation.id)
    const quantity = count ? Number(count.quantity) : null
    const topCategory = variation.categoryIds?.[0] ? topOf(variation.categoryIds[0]) : null

    return {
      id: variation.id,
      itemId: variation.itemId,
      displayName: variation.variationName && variation.variationName !== 'Regular'
        ? `${variation.name} - ${variation.variationName}`
        : variation.name || 'Unnamed item',
      sku: variation.sku,
      priceCents: variation.priceCents,
      currency: variation.currency,
      trackInventory: variation.trackInventory,
      sellable: variation.sellable,
      quantity,
      state: count?.state || (variation.trackInventory ? 'UNKNOWN' : 'NOT_TRACKED'),
      inStock: variation.trackInventory ? Boolean(quantity > 0) : true,
      source: 'square',
      categoryId: topCategory?.id || null,
      categoryName: topCategory?.name || 'Uncategorized',
      itemCreatedAt: variation.itemCreatedAt,
    }
  })

  return {
    ok: true,
    environment: resolveSquareEnvironment(env),
    locationId: locationId || null,
    itemCount: items.length,
    items,
  }
}

// Categories the public site never shows even if they're sellable in Square —
// e.g. snacks/concessions sold in-store but out of scope for the TCG-only
// public catalog, and accessories (sold in-store only, not part of the
// online card-shop catalog). Matched case-insensitively against the item's
// top-level category name, so tagging a new item under one of these just
// works with no code change; anything not listed here shows up on the public
// site by default.
const PUBLIC_CATALOG_EXCLUDED_CATEGORIES = ['snacks', 'food', 'drinks', 'concessions', 'accessories']

// Display order for the public catalog's category sections: these three
// always lead, in this exact sequence, when present; every other category
// falls in after, ranked by how much is actually on hand (busiest categories
// first).
const PINNED_CATEGORY_ORDER = ['magic', 'pokemon', 'bandai']

// Public-facing catalog: sellable items only, grouped by top-level category,
// with non-TCG categories (snacks, etc.) filtered out entirely. Internal
// fields (SKU, raw inventory state) are intentionally left off this shape —
// it's meant to be served to customers, unlike getSquareInventoryReport above.
export const getPublicSquareCatalog = async (env = process.env) => {
  loadSquareEnvironment()
  const variations = await listSquareCatalogItems(env)
  const locationId = resolveSquareCredentials(env).locationId
  // hiddenFromWeb is an explicit admin decision to keep this item off the
  // public site regardless of current stock — checked here (not just via the
  // in-stock filter below) so a hidden item never reappears just because it
  // has quantity on hand.
  const sellableVariations = variations.filter(
    variation => variation.sellable && !variation.hiddenFromWeb
  )
  const trackedVariations = sellableVariations.filter(variation => variation.trackInventory)

  const [counts, { topOf, nameOf }] = await Promise.all([
    locationId && trackedVariations.length
      ? listSquareInventory(env, {
          catalogObjectIds: trackedVariations.map(variation => variation.id),
          locationIds: [locationId],
        })
      : Promise.resolve([]),
    resolveTopLevelCategoryMap(env),
  ])
  const countByVariationId = new Map(counts.map(count => [count.catalog_object_id, count]))

  // The public site only ever shows items actually available right now — out-of-stock
  // items are still visible internally via the admin stock report, just not here. No
  // tracked count at all means Square isn't keeping stock for this variation
  // (made-to-order, custom work, etc.), so it's treated as available; a tracked
  // variation only counts as in stock once its on-hand quantity is over zero.
  const isInStock = variation => {
    if (!variation.trackInventory) return true
    const count = countByVariationId.get(variation.id)
    return Boolean(count && Number(count.quantity) > 0)
  }

  // Single pass: filters to in-stock + non-excluded, builds the public item
  // shape, and tallies on-hand quantity per category for the ordering below —
  // all in one loop rather than several chained filter/map passes, since the
  // per-category tally needs quantity that the returned item shape omits.
  const rawItems = []
  const stockByCategory = new Map()

  for (const variation of sellableVariations) {
    if (!isInStock(variation)) continue

    const leafId = variation.categoryIds?.[0] || null
    const topCategory = leafId ? topOf(leafId) : null
    const categoryName = topCategory?.name || 'Uncategorized'
    if (PUBLIC_CATALOG_EXCLUDED_CATEGORIES.includes(categoryName.toLowerCase())) continue

    // "Set" is the item's immediate/leaf category (e.g. "Bloomburrow" under
    // Magic > Pre-cons > Bloomburrow) — distinct from the top-level game-type
    // category used for grouping above. An item assigned directly to the
    // top-level category (no real subcategory) has no set of its own.
    const hasSet = Boolean(leafId && leafId !== topCategory?.id)
    const setId = hasSet ? leafId : null
    const setName = hasSet ? nameOf(leafId) : null

    const count = countByVariationId.get(variation.id)
    const quantity = variation.trackInventory ? Number(count?.quantity ?? 0) : 0
    stockByCategory.set(categoryName, (stockByCategory.get(categoryName) || 0) + quantity)

    rawItems.push({
      id: variation.id,
      itemId: variation.itemId,
      name: variation.variationName && variation.variationName !== 'Regular'
        ? `${variation.name} - ${variation.variationName}`
        : variation.name || 'Unnamed item',
      priceCents: variation.priceCents,
      currency: variation.currency,
      imageUrl: variation.imageUrl,
      categoryId: topCategory?.id || null,
      categoryName,
      setId,
      setName,
      releasedAt: variation.releasedAt,
      itemCreatedAt: variation.itemCreatedAt,
    })
  }

  const categoryNames = [...stockByCategory.keys()]
  const pinned = PINNED_CATEGORY_ORDER.map(lower =>
    categoryNames.find(name => name.toLowerCase() === lower)
  ).filter(Boolean)
  const middle = categoryNames
    .filter(name => !pinned.includes(name))
    .sort((a, b) => (stockByCategory.get(b) || 0) - (stockByCategory.get(a) || 0))

  const categoryRank = new Map([...pinned, ...middle].map((name, index) => [name, index]))
  // Primary key: category order (pinned games first, then by stock). Secondary
  // key: newest item first within a category — the default browse order the
  // public site wants. Prefers the admin-set `releasedAt` (outpost_released_at,
  // see above) over Square's own item-level created_at, since created_at
  // reflects whenever the catalog entry was last created/touched in Square
  // (bulk imports/cleanups skew it) rather than when the product actually
  // became available. Items with neither sort last rather than falsely
  // claiming to be newest.
  const sortDateMs = item => {
    const raw = item.releasedAt || item.itemCreatedAt
    return raw ? new Date(raw).getTime() : -Infinity
  }
  const items = rawItems.sort((a, b) => {
    const rankDiff = categoryRank.get(a.categoryName) - categoryRank.get(b.categoryName)
    if (rankDiff !== 0) return rankDiff
    return sortDateMs(b) - sortDateMs(a)
  })

  return {
    fetchedAt: new Date().toISOString(),
    environment: resolveSquareEnvironment(env),
    itemCount: items.length,
    items,
  }
}

const fetchAllCategoryObjects = async client => {
  const categories = []
  let cursor
  let page = 0

  do {
    const query = new URLSearchParams({ types: 'CATEGORY' })
    if (cursor) query.set('cursor', cursor)
    const payload = await client.request(`/v2/catalog/list?${query.toString()}`)
    categories.push(...(payload.objects || []))
    cursor = payload.cursor
    page += 1
  } while (cursor && page < CATALOG_PAGE_SAFETY_CAP)

  return categories
}

export const listSquareCategories = async (env = process.env) => {
  const client = clientFromEnv(env)
  const categories = await fetchAllCategoryObjects(client)

  const byId = new Map(categories.map(category => [category.id, category]))
  const pathOf = id => {
    const parts = []
    let current = id
    let guard = 0
    while (current && guard++ < 10) {
      const category = byId.get(current)
      if (!category) break
      parts.unshift(category.category_data?.name)
      current = category.category_data?.parent_category?.id
    }
    return parts.join(' > ')
  }

  return categories.map(category => ({
    id: category.id,
    name: category.category_data?.name || null,
    path: pathOf(category.id),
  }))
}

// Resolves any category id to its top-level (root) ancestor — used to group
// items into broad sections (game type on the public catalog; category
// groups on the admin stock/mass-inventory/catalog-editor pages) regardless
// of how deep the item's own assigned category sits in a sub-category chain.
// Also exposes a plain id->name lookup (nameOf) for the category itself
// (not its ancestor) — used by getPublicSquareCatalog to label an item's
// immediate/leaf category (its "set") separately from its top-level game type.
export const resolveTopLevelCategoryMap = async (env = process.env) => {
  const client = clientFromEnv(env)
  const categories = await fetchAllCategoryObjects(client)
  const byId = new Map(categories.map(category => [category.id, category]))

  const topOf = id => {
    let current = id
    let top = null
    let guard = 0
    while (current && guard++ < 10) {
      const category = byId.get(current)
      if (!category) break
      top = category
      current = category.category_data?.parent_category?.id
    }
    return top ? { id: top.id, name: top.category_data?.name || null } : null
  }

  const nameOf = id => byId.get(id)?.category_data?.name || null

  return { topOf, nameOf }
}

const fetchRawCatalogObject = (client, itemId) =>
  client.request(`/v2/catalog/object/${itemId}?include_related_objects=true`)

export const getSquareCatalogItem = async (itemId, env = process.env) => {
  const client = clientFromEnv(env)

  const payload = await fetchRawCatalogObject(client, itemId)
  const object = payload.object
  const itemData = object.item_data || {}
  const rawVariations = itemData.variations || []

  // `include_related_objects` isn't reliably populated (observed empty against
  // sandbox even for a valid, existing category) — resolve names against the
  // full category list instead of trusting it.
  const categoryNames = (itemData.categories || []).length
    ? new Map((await listSquareCategories(env)).map(category => [category.id, category.name]))
    : new Map()

  // `related_objects` usually has the IMAGE objects inline, but not always
  // reliably (see fallback below) — build a lookup for whatever IS there, for
  // both the item's own image and every variation's, resolved together.
  const relatedImagesById = new Map(
    (payload.related_objects || [])
      .filter(related => related.type === 'IMAGE')
      .map(related => [related.id, related.image_data?.url || null])
  )
  const resolveImageUrl = async imageId => {
    if (!imageId) return null
    if (relatedImagesById.has(imageId)) return relatedImagesById.get(imageId)
    const imagePayload = await client.request(`/v2/catalog/object/${imageId}`).catch(() => null)
    return imagePayload?.object?.image_data?.url || null
  }

  const itemImageId = itemData.image_ids?.[0] || null
  const imageUrl = await resolveImageUrl(itemImageId)

  const trackedVariationIds = rawVariations
    .filter(variation => variation.item_variation_data?.track_inventory)
    .map(variation => variation.id)

  let quantityById = new Map()
  if (trackedVariationIds.length) {
    const credentials = resolveSquareCredentials(env)
    if (credentials.locationId) {
      const counts = await listSquareInventory(env, {
        catalogObjectIds: trackedVariationIds,
        locationIds: [credentials.locationId],
      })
      quantityById = new Map(counts.map(count => [count.catalog_object_id, Number(count.quantity)]))
    }
  }

  const variations = await Promise.all(
    rawVariations.map(async variation => {
      const variationData = variation.item_variation_data || {}
      const ownImageId = variationData.image_ids?.[0] || null
      return {
        id: variation.id,
        name: variationData.name || null,
        sku: variationData.sku || null,
        priceCents: variationData.price_money?.amount ?? null,
        currency: variationData.price_money?.currency || 'USD',
        trackInventory: Boolean(variationData.track_inventory),
        sellable: variationData.sellable !== false,
        stockable: variationData.stockable !== false,
        quantity: variationData.track_inventory ? (quantityById.get(variation.id) ?? 0) : null,
        costCents: readCostCents(variation),
        // hasOwnImage distinguishes "this variation has its own photo" from
        // "showing the item's shared group photo as a fallback" — the admin
        // UI uses this to label which one is currently displayed.
        imageUrl: await resolveImageUrl(ownImageId || itemImageId),
        hasOwnImage: Boolean(ownImageId),
      }
    })
  )

  return {
    id: object.id,
    version: object.version,
    name: itemData.name || null,
    description: itemData.description || '',
    hiddenFromWeb: readHiddenFromWeb(object),
    releasedAt: readReleasedAt(object),
    itemCreatedAt: object.created_at || null,
    imageUrl,
    categories: (itemData.categories || []).map(category => ({
      id: category.id,
      name: categoryNames.get(category.id) || null,
    })),
    variations,
  }
}

// Square's catalog upsert replaces the whole object graph for an id, so every
// untouched field (sku, tax_ids, image_ids, reporting_category, ...) must be
// echoed back exactly as fetched — only the allow-listed fields below are changed.
// `changes.variations` is an array of { id, name?, priceCents?, trackInventory?,
// sellable?, stockable?, costCents? } — one entry per variation being edited.
// costCents: null clears the stored unit cost; omitting the field entirely
// leaves it untouched. Variations not referenced in that array (or not
// present in `changes` at all) pass through untouched, same as every other
// field on this object.
export const updateSquareCatalogItem = async (itemId, changes, env = process.env) => {
  const client = clientFromEnv(env)

  const current = await fetchRawCatalogObject(client, itemId)
  const object = current.object
  const itemData = object.item_data || {}
  const variations = itemData.variations || []

  if (changes.name !== undefined) itemData.name = changes.name
  if (changes.description !== undefined) {
    itemData.description = changes.description
    itemData.description_html = changes.description
    itemData.description_plaintext = changes.description
  }
  if (changes.hiddenFromWeb !== undefined) {
    object.custom_attribute_values = buildHiddenFromWebAttributeValues(
      object.custom_attribute_values,
      changes.hiddenFromWeb
    )
  }
  if (changes.releasedAt !== undefined) {
    object.custom_attribute_values = buildReleasedAtAttributeValues(
      object.custom_attribute_values,
      changes.releasedAt
    )
  }
  if (changes.categoryIds !== undefined) {
    itemData.categories = changes.categoryIds.map(id => ({ id }))
    // Square's Dashboard/POS/reports read `reporting_category` (a separate,
    // single-value field) as the item's "real" category — it doesn't follow
    // `categories` automatically, so it has to be kept in sync by hand or a
    // category change silently fails to show up anywhere that reads it.
    if (changes.categoryIds.length > 0) {
      itemData.reporting_category = { id: changes.categoryIds[0] }
    } else {
      delete itemData.reporting_category
    }
  }

  if (changes.variations !== undefined) {
    const changesByVariationId = new Map(changes.variations.map(variation => [variation.id, variation]))
    for (const variation of variations) {
      const variationChanges = changesByVariationId.get(variation.id)
      if (!variationChanges) continue

      const variationData = variation.item_variation_data || {}
      if (variationChanges.name !== undefined) variationData.name = variationChanges.name
      if (variationChanges.priceCents !== undefined) {
        // Draft items created with no price start as VARIABLE_PRICING (no
        // price_money allowed); setting a price now means it's a fixed price.
        variationData.pricing_type = 'FIXED_PRICING'
        variationData.price_money = {
          amount: variationChanges.priceCents,
          currency: variationData.price_money?.currency || 'USD',
        }
      }
      if (variationChanges.trackInventory !== undefined) variationData.track_inventory = variationChanges.trackInventory
      if (variationChanges.sellable !== undefined) variationData.sellable = variationChanges.sellable
      if (variationChanges.stockable !== undefined) variationData.stockable = variationChanges.stockable
      if (variationChanges.costCents !== undefined) {
        variation.custom_attribute_values = buildCostAttributeValues(
          variation.custom_attribute_values,
          variationChanges.costCents
        )
      }
      variation.item_variation_data = variationData
    }
  }

  itemData.variations = variations
  object.item_data = itemData

  try {
    const result = await client.request('/v2/catalog/object', {
      method: 'POST',
      body: {
        idempotency_key: crypto.randomUUID(),
        object,
      },
    })
    return result.catalog_object
  } catch (error) {
    if (isVersionMismatch(error)) throw new SquareVersionMismatchError(itemId)
    throw error
  }
}

export const createSquareCategory = async ({ name, parentCategoryId }, env = process.env) => {
  const client = clientFromEnv(env)

  const result = await client.request('/v2/catalog/object', {
    method: 'POST',
    body: {
      idempotency_key: crypto.randomUUID(),
      object: {
        type: 'CATEGORY',
        id: '#new-category',
        category_data: {
          name,
          ...(parentCategoryId ? { parent_category: { type: 'CATEGORY', id: parentCategoryId } } : {}),
        },
      },
    },
  })

  const created = result.catalog_object
  return {
    id: created.id,
    name: created.category_data?.name || null,
    path: parentCategoryId ? undefined : created.category_data?.name || null,
  }
}

// variations: [{ name, sku, priceCents?, trackInventory?, sellable?, stockable? }]
// A variation without priceCents is created as VARIABLE_PRICING (price set at
// sale time) rather than failing on a missing price — useful for draft items
// staged ahead of a set's release, before the shop has decided resale pricing.
export const createSquareCatalogItem = async ({ name, description, categoryIds = [], ecomVisibility, variations }, env = process.env) => {
  const client = clientFromEnv(env)

  const object = {
    type: 'ITEM',
    id: '#new-item',
    item_data: {
      name,
      description: description || undefined,
      ecom_visibility: ecomVisibility || undefined,
      categories: categoryIds.map(id => ({ id })),
      variations: variations.map((variation, index) => ({
        type: 'ITEM_VARIATION',
        id: `#new-item-var-${index}`,
        item_variation_data: {
          name: variation.name || 'Regular',
          sku: variation.sku || undefined,
          pricing_type: variation.priceCents != null ? 'FIXED_PRICING' : 'VARIABLE_PRICING',
          ...(variation.priceCents != null ? { price_money: { amount: variation.priceCents, currency: 'USD' } } : {}),
          track_inventory: variation.trackInventory ?? false,
          sellable: variation.sellable ?? true,
          stockable: variation.stockable ?? true,
        },
      })),
    },
  }

  const result = await client.request('/v2/catalog/object', {
    method: 'POST',
    body: { idempotency_key: crypto.randomUUID(), object },
  })
  return result.catalog_object
}

export const deleteSquareCatalogItem = async (itemId, env = process.env) => {
  const client = clientFromEnv(env)
  return client.request(`/v2/catalog/object/${itemId}`, { method: 'DELETE' })
}

// Square requires every item to keep at least one variation — deleting the
// last one has to go through deleteSquareCatalogItem (the whole item) instead.
export const deleteSquareCatalogVariation = async (itemId, variationId, env = process.env) => {
  const client = clientFromEnv(env)

  const current = await fetchRawCatalogObject(client, itemId)
  const variations = current.object.item_data?.variations || []
  if (variations.length <= 1) {
    throw new Error('An item must have at least one variation — delete the whole item instead')
  }
  if (!variations.some(variation => variation.id === variationId)) {
    throw new Error('That variation does not belong to this item')
  }

  return client.request(`/v2/catalog/object/${variationId}`, { method: 'DELETE' })
}

// Appends a new variation to an existing item (temp id '#new-variation',
// same pattern as createSquareCatalogItem's per-variation temp ids). Unlike
// updateSquareCatalogItem's PUT path — which locks SKU editing on *existing*
// variations to protect already-scanned in-store barcodes — an initial `sku`
// IS accepted here: a brand-new variation has no barcode yet, so there's
// nothing to protect. Once created, it becomes SKU-locked like every other
// variation via the existing edit route's guard.
export const addSquareCatalogVariation = async (
  itemId,
  { name, sku, priceCents, trackInventory, sellable, stockable },
  env = process.env
) => {
  const client = clientFromEnv(env)

  const current = await fetchRawCatalogObject(client, itemId)
  const object = current.object
  const itemData = object.item_data || {}
  const variations = itemData.variations || []

  // A new ITEM_VARIATION defaults to "present at all locations" — Square
  // rejects that outright when the parent ITEM isn't also present at all
  // locations (confirmed live: "is enabled at all future locations, but the
  // referenced object... is not"). Copy the parent's own location scoping so
  // the new variation always matches it instead of Square's default.
  variations.push({
    type: 'ITEM_VARIATION',
    id: '#new-variation',
    present_at_all_locations: object.present_at_all_locations || false,
    ...(object.present_at_all_locations
      ? {}
      : { present_at_location_ids: object.present_at_location_ids || [] }),
    item_variation_data: {
      item_id: itemId,
      name: name || 'Regular',
      sku: sku || undefined,
      pricing_type: priceCents != null ? 'FIXED_PRICING' : 'VARIABLE_PRICING',
      ...(priceCents != null ? { price_money: { amount: priceCents, currency: 'USD' } } : {}),
      track_inventory: trackInventory ?? false,
      sellable: sellable ?? true,
      stockable: stockable ?? true,
    },
  })
  itemData.variations = variations
  object.item_data = itemData

  const result = await client.request('/v2/catalog/object', {
    method: 'POST',
    body: { idempotency_key: crypto.randomUUID(), object },
  })
  return result.catalog_object
}

// ─── Batch catalog primitives ────────────────────────────────────────────────
// Every bulk feature (bulk delete/category/visibility, category merge) is
// built by composing these three — none of them, or their callers, touch the
// single-object /v2/catalog/object endpoint. Proven against this exact Square
// account already by api/scripts/sync-sandbox-catalog.js (which calls the
// same two Square endpoints directly); these are the same primitives wired
// properly into squarePosClient.js so the admin app can use them too.

// Returns a Map<id, rawObject> for every requested id, chunked at Square's
// 1000-id limit per call. `relatedObjectsById` is only populated when
// includeRelatedObjects is true (costs an extra round of data per chunk).
export const batchRetrieveSquareCatalogObjects = async (
  objectIds,
  { includeRelatedObjects = false } = {},
  env = process.env
) => {
  const client = clientFromEnv(env)
  const objectsById = new Map()
  const relatedObjectsById = new Map()

  for (let i = 0; i < objectIds.length; i += CATALOG_RETRIEVE_BATCH_SIZE) {
    const chunk = objectIds.slice(i, i + CATALOG_RETRIEVE_BATCH_SIZE)
    const payload = await client.request('/v2/catalog/batch-retrieve', {
      method: 'POST',
      body: { object_ids: chunk, include_related_objects: includeRelatedObjects },
    })
    for (const object of payload.objects || []) objectsById.set(object.id, object)
    for (const related of payload.related_objects || []) relatedObjectsById.set(related.id, related)
  }

  return { objectsById, relatedObjectsById }
}

// Upserts already-mutated raw catalog objects (as returned by
// batchRetrieveSquareCatalogObjects and then modified in place), chunked at
// Square's 1000-objects-per-batch / 10000-per-request limits. One
// idempotency_key per chunk. id_mappings (temp id -> real id, relevant if a
// chunk creates brand-new sub-objects) are merged across chunks.
export const batchUpsertSquareCatalogObjects = async (objects, env = process.env) => {
  const client = clientFromEnv(env)
  const resultObjects = []
  const idMappings = new Map()

  for (let i = 0; i < objects.length; i += CATALOG_UPSERT_BATCH_SIZE) {
    const chunk = objects.slice(i, i + CATALOG_UPSERT_BATCH_SIZE)
    const payload = await client.request('/v2/catalog/batch-upsert', {
      method: 'POST',
      body: {
        idempotency_key: crypto.randomUUID(),
        batches: [{ objects: chunk }],
      },
    })
    resultObjects.push(...(payload.objects || []))
    for (const mapping of payload.id_mappings || []) {
      idMappings.set(mapping.client_object_id, mapping.object_id)
    }
  }

  return { objects: resultObjects, idMappings }
}

// Deletes many catalog objects (chunked at Square's 200-ids-per-call limit).
// Square allows partial success per call — accumulates whatever actually got
// deleted across every chunk rather than throwing on the first partial miss.
export const batchDeleteSquareCatalogObjects = async (objectIds, env = process.env) => {
  const client = clientFromEnv(env)
  const deletedIds = []

  for (let i = 0; i < objectIds.length; i += CATALOG_DELETE_BATCH_SIZE) {
    const chunk = objectIds.slice(i, i + CATALOG_DELETE_BATCH_SIZE)
    const payload = await client.request('/v2/catalog/batch-delete', {
      method: 'POST',
      body: { object_ids: chunk },
    })
    deletedIds.push(...(payload.deleted_object_ids || []))
  }

  return { deletedIds }
}

// ─── Bulk item actions (admin multi-select) ──────────────────────────────────
// AdminSquareCatalog.vue's list is one row per VARIATION (from
// getSquareInventoryReport), so a multi-variation item shows as multiple rows
// sharing one itemId — selection there is keyed by itemId, meaning these
// three functions always operate on whole ITEMs, never individual variations.

export const deleteSquareCatalogItemsBatch = async (itemIds, env = process.env) =>
  batchDeleteSquareCatalogObjects(itemIds, env)

// categoryId: null clears categorization entirely (removes categories +
// reporting_category). Otherwise replaces whatever categories each item had
// with just this one — distinct from mergeSquareCategories, which moves
// *everything* out of one category; this moves an admin-picked subset into
// exactly one target category.
export const setSquareCatalogItemsCategoryBatch = async (itemIds, categoryId, env = process.env) => {
  const { objectsById } = await batchRetrieveSquareCatalogObjects(itemIds, {}, env)
  const mutated = [...objectsById.values()].map(object => {
    const itemData = object.item_data || {}
    itemData.categories = categoryId ? [{ id: categoryId }] : []
    if (categoryId) itemData.reporting_category = { id: categoryId }
    else delete itemData.reporting_category
    object.item_data = itemData
    return object
  })
  return batchUpsertSquareCatalogObjects(mutated, env)
}

// hiddenFromWeb is item-level (this site's own outpost_hide_from_web custom
// attribute — see the comment above HIDE_FROM_WEB_ATTRIBUTE_KEY); sellable is
// per-variation, so setting it here cascades to EVERY variation within each
// fetched item. Either field can be set independently of the other.
export const setSquareCatalogItemsVisibilityBatch = async (
  itemIds,
  { hiddenFromWeb, sellable },
  env = process.env
) => {
  const { objectsById } = await batchRetrieveSquareCatalogObjects(itemIds, {}, env)
  const mutated = [...objectsById.values()].map(object => {
    if (hiddenFromWeb !== undefined) {
      object.custom_attribute_values = buildHiddenFromWebAttributeValues(
        object.custom_attribute_values,
        hiddenFromWeb
      )
    }
    const itemData = object.item_data || {}
    if (sellable !== undefined) {
      itemData.variations = (itemData.variations || []).map(variation => {
        variation.item_variation_data = { ...(variation.item_variation_data || {}), sellable }
        return variation
      })
    }
    object.item_data = itemData
    return object
  })
  return batchUpsertSquareCatalogObjects(mutated, env)
}

// releasedAt: null clears it (falls back to itemCreatedAt again) for every
// selected item — item-level only, no per-variation cascade needed (a
// product's release date is one decision for the whole item, same scoping as
// hiddenFromWeb). Lets staff correct a whole shipment/batch at once instead of
// opening each item individually.
export const setSquareCatalogItemsReleasedAtBatch = async (itemIds, releasedAt, env = process.env) => {
  const { objectsById } = await batchRetrieveSquareCatalogObjects(itemIds, {}, env)
  const mutated = [...objectsById.values()].map(object => {
    object.custom_attribute_values = buildReleasedAtAttributeValues(
      object.custom_attribute_values,
      releasedAt
    )
    return object
  })
  return batchUpsertSquareCatalogObjects(mutated, env)
}

// ─── Category tree management ────────────────────────────────────────────────
// Rename/reparent are simple single-object upserts; delete refuses outright
// (no Square call at all) if anything still references the category, forcing
// an explicit merge/reassign first rather than silently orphaning items or
// leaving child categories under a deleted parent.

export const renameSquareCategory = async (categoryId, name, env = process.env) => {
  const client = clientFromEnv(env)
  const current = await fetchRawCatalogObject(client, categoryId)
  const object = current.object
  object.category_data = { ...(object.category_data || {}), name }

  const result = await client.request('/v2/catalog/object', {
    method: 'POST',
    body: { idempotency_key: crypto.randomUUID(), object },
  })
  return result.catalog_object
}

// parentCategoryId: null promotes the category to top-level (removes parent_category).
export const reparentSquareCategory = async (categoryId, parentCategoryId, env = process.env) => {
  const client = clientFromEnv(env)
  const current = await fetchRawCatalogObject(client, categoryId)
  const object = current.object
  const categoryData = { ...(object.category_data || {}) }
  if (parentCategoryId) {
    categoryData.parent_category = { type: 'CATEGORY', id: parentCategoryId }
  } else {
    delete categoryData.parent_category
  }
  object.category_data = categoryData

  const result = await client.request('/v2/catalog/object', {
    method: 'POST',
    body: { idempotency_key: crypto.randomUUID(), object },
  })
  return result.catalog_object
}

// Refuses outright (throws before making any Square call) if the category is
// still referenced by any item, or still has child categories under it —
// same defensive style as deleteSquareCatalogVariation's "keep >=1 variation"
// guard. Callers must merge/reassign items and reparent children first.
export const deleteSquareCategory = async (categoryId, env = process.env) => {
  const client = clientFromEnv(env)
  const [variations, allCategories] = await Promise.all([
    listSquareCatalogItems(env),
    fetchAllCategoryObjects(client),
  ])

  const referencingItemCount = new Set(
    variations.filter(variation => variation.categoryIds.includes(categoryId)).map(variation => variation.itemId)
  ).size
  if (referencingItemCount > 0) {
    throw new Error(`Cannot delete — ${referencingItemCount} item(s) still use this category. Merge it into another category first.`)
  }

  const childCategoryCount = allCategories.filter(
    category => category.category_data?.parent_category?.id === categoryId
  ).length
  if (childCategoryCount > 0) {
    throw new Error(`Cannot delete — ${childCategoryCount} sub-category(ies) still live under this category. Re-parent or delete them first.`)
  }

  return client.request(`/v2/catalog/object/${categoryId}`, { method: 'DELETE' })
}

// Reassigns every item currently referencing fromCategoryId over to
// toCategoryId (batch-retrieve -> mutate categories/reporting_category,
// reusing the same sync rule as updateSquareCatalogItem -> batch-upsert),
// then deletes the now-empty fromCategoryId. If fromCategoryId still has
// child categories underneath it, the trailing delete call throws the same
// guard error as deleteSquareCategory — merge only reassigns items, it
// doesn't restructure the category tree itself.
export const mergeSquareCategories = async (fromCategoryId, toCategoryId, env = process.env) => {
  if (fromCategoryId === toCategoryId) {
    throw new Error('Cannot merge a category into itself')
  }

  const variations = await listSquareCatalogItems(env)
  const affectedItemIds = [
    ...new Set(
      variations.filter(variation => variation.categoryIds.includes(fromCategoryId)).map(variation => variation.itemId)
    ),
  ]

  if (affectedItemIds.length > 0) {
    const { objectsById } = await batchRetrieveSquareCatalogObjects(affectedItemIds, {}, env)
    const mutated = [...objectsById.values()].map(object => {
      const itemData = object.item_data || {}
      const existingIds = (itemData.categories || []).map(category => category.id)
      const nextIds = [...new Set(existingIds.map(id => (id === fromCategoryId ? toCategoryId : id)))]
      itemData.categories = nextIds.map(id => ({ id }))
      if (itemData.reporting_category?.id === fromCategoryId) {
        itemData.reporting_category = { id: toCategoryId }
      }
      object.item_data = itemData
      return object
    })
    await batchUpsertSquareCatalogObjects(mutated, env)
  }

  await deleteSquareCategory(fromCategoryId, env)
  return { mergedItemCount: affectedItemIds.length }
}

// objectId can be either an ITEM id (sets the item's shared/group photo) or
// an ITEM_VARIATION id (sets that one variation's own photo) — Square's
// CreateCatalogImage endpoint accepts either interchangeably, confirmed
// against the official docs (developer.squareup.com/docs/catalog-api/upload-and-attach-images).
export const uploadSquareCatalogImage = async (objectId, { buffer, filename, mimeType }, env = process.env) => {
  loadSquareEnvironment()
  const credentials = resolveSquareCredentials(env)
  if (!credentials.accessToken) {
    throw new Error('Square access token is required')
  }

  const formData = new FormData()
  formData.append('request', JSON.stringify({
    idempotency_key: crypto.randomUUID(),
    object_id: objectId,
    image: { id: '#new-image', type: 'IMAGE', image_data: {} },
  }))
  formData.append('file', new Blob([buffer], { type: mimeType }), filename)

  const response = await fetch(buildSquareApiUrl('/v2/catalog/images', credentials.environment), {
    method: 'POST',
    headers: { Authorization: `Bearer ${credentials.accessToken}` },
    body: formData,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.message || payload.errors?.[0]?.detail || `Square image upload failed with ${response.status}`)
    error.status = response.status
    error.squareErrors = payload.errors || []
    throw error
  }

  const newImageId = payload.image?.id
  const imageUrl = payload.image?.image_data?.url || null

  // Square's CreateCatalogImage APPENDS to the target's image_ids rather than
  // replacing/prepending it (confirmed live) — every other read path here
  // treats image_ids[0] as "the" image, so a newly uploaded image silently
  // never displays unless it's moved to the front ourselves. Works the same
  // way whether objectId is an ITEM (item_data) or ITEM_VARIATION
  // (item_variation_data) — pick the matching nested data key.
  if (newImageId) {
    const client = clientFromEnv(env)
    const current = await fetchRawCatalogObject(client, objectId)
    const object = current.object
    const dataKey = object.type === 'ITEM_VARIATION' ? 'item_variation_data' : 'item_data'
    const data = object[dataKey] || {}
    const existingIds = data.image_ids || []

    data.image_ids = [newImageId, ...existingIds.filter(id => id !== newImageId)]
    object[dataKey] = data

    await client.request('/v2/catalog/object', {
      method: 'POST',
      body: { idempotency_key: crypto.randomUUID(), object },
    })
  }

  return { imageUrl }
}

export const adjustSquareInventoryCount = async (variationId, { quantity, locationId }, env = process.env) => {
  const client = clientFromEnv(env)
  const resolvedLocationId = locationId || client.locationId
  if (!resolvedLocationId) {
    throw new Error('A Square location id is required to correct inventory')
  }

  return client.request('/v2/inventory/batch-change', {
    method: 'POST',
    body: {
      idempotency_key: crypto.randomUUID(),
      ignore_unchanged_counts: true,
      changes: [
        {
          type: 'PHYSICAL_COUNT',
          physical_count: {
            catalog_object_id: variationId,
            location_id: resolvedLocationId,
            state: 'IN_STOCK',
            quantity: String(quantity),
            occurred_at: new Date().toISOString(),
          },
        },
      ],
    },
  })
}

// changes: [{ variationId, quantity }] — sets an on-hand physical count for
// each in as few /v2/inventory/batch-change calls as possible (Square allows
// up to 100 PHYSICAL_COUNT entries per call, reusing the same batch size as
// the inventory-read path). One `occurred_at` timestamp per chunk. Returns
// per-chunk raw Square responses so a partial failure is visible rather than
// silently dropped.
export const adjustSquareInventoryCountBatch = async (changes, env = process.env) => {
  const client = clientFromEnv(env)
  const resolvedLocationId = client.locationId
  if (!resolvedLocationId) {
    throw new Error('A Square location id is required to correct inventory')
  }

  const results = []
  for (let i = 0; i < changes.length; i += INVENTORY_BATCH_SIZE) {
    const batch = changes.slice(i, i + INVENTORY_BATCH_SIZE)
    const occurredAt = new Date().toISOString()
    const result = await client.request('/v2/inventory/batch-change', {
      method: 'POST',
      body: {
        idempotency_key: crypto.randomUUID(),
        ignore_unchanged_counts: true,
        changes: batch.map(({ variationId, quantity }) => ({
          type: 'PHYSICAL_COUNT',
          physical_count: {
            catalog_object_id: variationId,
            location_id: resolvedLocationId,
            state: 'IN_STOCK',
            quantity: String(quantity),
            occurred_at: occurredAt,
          },
        })),
      },
    })
    results.push(result)
  }

  return { updatedCount: changes.length, results }
}

// ─── Quick Restock (box -> loose packs) ──────────────────────────────────────
// Square has no native "kit"/bundle concept for "opening a sealed box yields
// N loose packs" (confirmed via Square's own developer forum: this has to be
// modeled entirely in application logic) — the box<->packs pairing itself is
// stored in Redis (see RESTOCK_MAPPINGS_KEY in server.js), this function just
// applies one already-configured pairing. Deliberately reuses the existing,
// proven adjustSquareInventoryCountBatch rather than a new inventory-write
// path, and reads current quantities fresh immediately before writing (not
// from a stale cached report) to minimize the race window against a
// concurrent sale — the same read-then-write pattern every other
// inventory-correction flow in this app already uses.
export const applyBoxToPackRestock = async (
  { boxVariationId, packsVariationId, packsPerBox, boxesOpened },
  env = process.env
) => {
  if (!Number.isInteger(boxesOpened) || boxesOpened <= 0) {
    throw new Error('boxesOpened must be a positive integer')
  }

  const locationId = clientFromEnv(env).locationId
  if (!locationId) {
    throw new Error('A Square location id is required to apply a restock')
  }

  const counts = await listSquareInventory(env, {
    catalogObjectIds: [boxVariationId, packsVariationId],
    locationIds: [locationId],
  })
  const countByVariationId = new Map(
    counts.map(count => [count.catalog_object_id, Number(count.quantity)])
  )
  const previousBoxQty = countByVariationId.get(boxVariationId) ?? 0
  const previousPacksQty = countByVariationId.get(packsVariationId) ?? 0

  if (boxesOpened > previousBoxQty) {
    throw new Error(`Cannot open ${boxesOpened} box(es) — only ${previousBoxQty} in stock`)
  }

  const newBoxQty = previousBoxQty - boxesOpened
  const newPacksQty = previousPacksQty + boxesOpened * packsPerBox

  await adjustSquareInventoryCountBatch(
    [
      { variationId: boxVariationId, quantity: newBoxQty },
      { variationId: packsVariationId, quantity: newPacksQty },
    ],
    env
  )

  return { previousBoxQty, newBoxQty, previousPacksQty, newPacksQty }
}
