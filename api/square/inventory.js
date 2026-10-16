import { AppError } from '../middleware/errorHandler.js'
import crypto from 'node:crypto'
import { listSquareCatalogItems } from './catalog.js'
import { resolveTopLevelCategoryMap } from './categories.js'
import { clientFromEnv, resolveSquareCredentials, resolveSquareEnvironment } from './client.js'

const INVENTORY_BATCH_SIZE = 100

export const listSquareInventory = async (
  env = process.env,
  { catalogObjectIds = [], locationIds = [] } = {}
) => {
  const client = clientFromEnv(env)

  const resolvedLocationIds = locationIds.length
    ? locationIds
    : client.locationId
      ? [client.locationId]
      : []
  if (!catalogObjectIds.length || !resolvedLocationIds.length) return []

  const counts = []
  for (let i = 0; i < catalogObjectIds.length; i += INVENTORY_BATCH_SIZE) {
    const batch = catalogObjectIds.slice(i, i + INVENTORY_BATCH_SIZE)
    const payload = await client.request('/v2/inventory/counts/batch-retrieve', {
      method: 'POST',
      body: {
        catalog_object_ids: batch,
        location_ids: resolvedLocationIds,
        // Without this Square also returns a variation's RETURNED_BY_CUSTOMER /
        // WASTE / etc. counts as separate rows, and every caller keys these by
        // catalog_object_id alone — so whichever state came back last silently
        // became "the" on-hand quantity (confirmed live: items showing a stale
        // returns count of 0 or 1 while their sellable stock was -861).
        states: ['IN_STOCK'],
      },
    })
    counts.push(...(payload.counts || []))
  }

  return counts
}

export const getSquareInventoryReport = async (env = process.env) => {
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
      itemName: variation.name || null,
      displayName:
        variation.variationName && variation.variationName !== 'Regular'
          ? `${variation.name} - ${variation.variationName}`
          : variation.name || 'Unnamed item',
      sku: variation.sku,
      upc: variation.upc,
      imageUrl: variation.imageUrl,
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

export const adjustSquareInventoryCount = async (
  variationId,
  { quantity, locationId },
  env = process.env
) => {
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
    throw new AppError(409, `Cannot open ${boxesOpened} box(es) — only ${previousBoxQty} in stock`)
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
