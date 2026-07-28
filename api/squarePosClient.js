import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const SANDBOX_BASE_URL = 'https://connect.squareupsandbox.com'
const PRODUCTION_BASE_URL = 'https://connect.squareup.com'
const PLACEHOLDER_VALUES = new Set(['YOUR_LOCATION_ID', 'YOUR_ACCESS_TOKEN', 'YOUR_APPLICATION_ID', 'YOUR_APP_ID', 'YOUR_TOKEN'])
const CATALOG_PAGE_SAFETY_CAP = 200
const INVENTORY_BATCH_SIZE = 100

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
  let cursor
  let page = 0

  do {
    const query = new URLSearchParams({ types: 'ITEM' })
    if (cursor) query.set('cursor', cursor)

    const payload = await client.request(`/v2/catalog/list?${query.toString()}`)

    for (const object of payload.objects || []) {
      const itemData = object.item_data
      if (!itemData) continue

      const categoryIds = (itemData.categories || []).map(category => category.id)

      for (const variation of itemData.variations || []) {
        const variationData = variation.item_variation_data || {}
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
          costCents: readCostCents(variation),
          itemCreatedAt: object.created_at || null,
        })
      }
    }

    cursor = payload.cursor
    page += 1
  } while (cursor && page < CATALOG_PAGE_SAFETY_CAP)

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

  return { topOf }
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

  const primaryImageId = itemData.image_ids?.[0]
  let imageUrl = primaryImageId
    ? (payload.related_objects || []).find(related => related.type === 'IMAGE' && related.id === primaryImageId)
        ?.image_data?.url || null
    : null
  if (primaryImageId && !imageUrl) {
    const imagePayload = await client.request(`/v2/catalog/object/${primaryImageId}`).catch(() => null)
    imageUrl = imagePayload?.object?.image_data?.url || null
  }

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

  const variations = rawVariations.map(variation => {
    const variationData = variation.item_variation_data || {}
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
    }
  })

  return {
    id: object.id,
    version: object.version,
    name: itemData.name || null,
    description: itemData.description || '',
    ecomVisibility: itemData.ecom_visibility || null,
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
  if (changes.ecomVisibility !== undefined) itemData.ecom_visibility = changes.ecomVisibility
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

export const uploadSquareCatalogImage = async (itemId, { buffer, filename, mimeType }, env = process.env) => {
  loadSquareEnvironment()
  const credentials = resolveSquareCredentials(env)
  if (!credentials.accessToken) {
    throw new Error('Square access token is required')
  }

  const formData = new FormData()
  formData.append('request', JSON.stringify({
    idempotency_key: crypto.randomUUID(),
    object_id: itemId,
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

  return { imageUrl: payload.image?.image_data?.url || null }
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
