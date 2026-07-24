#!/usr/bin/env node
// Mirrors the current production Square catalog (categories + items + variations)
// into the Square sandbox account, so admin features can be exercised against a
// realistic copy of the real product list without ever writing to production.
//
// Sandbox is treated as disposable: every run wipes whatever catalog objects are
// currently in sandbox and recreates them fresh from the current production
// snapshot. Images and tax/location references aren't copied — they're
// production-account-specific ids that don't exist in the sandbox account.
//
// Usage:
//   node scripts/sync-sandbox-catalog.js                        # preview only, no changes
//   node scripts/sync-sandbox-catalog.js --apply                # wipe + recreate catalog only
//   node scripts/sync-sandbox-catalog.js --apply --with-inventory  # also copy production
//                                                                  # on-hand counts into sandbox
//
// --with-inventory is for validating inventory-display changes (stock report,
// mass-update, sales) against realistic numbers before running the real
// scripts/routes against production — without it, every synced item starts
// at a real-but-uninteresting 0 count, since inventory is never part of the
// catalog snapshot itself.

import crypto from 'node:crypto'
import { createSquarePosClient, loadSquareEnvironment } from '../squarePosClient.js'

loadSquareEnvironment()

const APPLY = process.argv.includes('--apply')
const COPY_INVENTORY = process.argv.includes('--with-inventory')
const DELETE_BATCH_SIZE = 100 // Square's batch-delete max is 200 object_ids per call
const INVENTORY_BATCH_SIZE = 100 // Square's inventory batch-change/retrieve max is 100 per call

const prodClient = createSquarePosClient({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: 'production',
  applicationId: process.env.SQUARE_APPLICATION_ID,
})

const sandboxClient = createSquarePosClient({
  accessToken: process.env.SQUARE_SANDBOX_ACCESS_TOKEN,
  environment: 'sandbox',
  applicationId: process.env.SQUARE_SANDBOX_APPLICATION_ID,
})

const listAll = async (client, types) => {
  const objects = []
  let cursor
  do {
    const query = new URLSearchParams({ types })
    if (cursor) query.set('cursor', cursor)
    const payload = await client.request(`/v2/catalog/list?${query.toString()}`)
    objects.push(...(payload.objects || []))
    cursor = payload.cursor
  } while (cursor)
  return objects
}

const chunk = (items, size) => {
  const out = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

const fetchInventoryCounts = async (client, catalogObjectIds, locationId) => {
  const counts = []
  for (const batch of chunk(catalogObjectIds, INVENTORY_BATCH_SIZE)) {
    const payload = await client.request('/v2/inventory/counts/batch-retrieve', {
      method: 'POST',
      body: { catalog_object_ids: batch, location_ids: [locationId] },
    })
    counts.push(...(payload.counts || []))
  }
  return counts
}

const categoryTempId = id => `#cat-${id}`
const itemTempId = id => `#item-${id}`
const variationTempId = id => `#var-${id}`

const buildSandboxCategory = category => {
  // Top-level categories still carry a `parent_category` object (just an
  // `ordinal`, no `id`) — only treat it as a real parent link if `id` is set.
  const parentId = category.category_data?.parent_category?.id
  return {
    type: 'CATEGORY',
    id: categoryTempId(category.id),
    category_data: {
      name: category.category_data?.name,
      ...(parentId ? { parent_category: { type: 'CATEGORY', id: categoryTempId(parentId) } } : {}),
    },
  }
}

const buildSandboxItem = item => {
  const itemData = item.item_data || {}
  return {
    type: 'ITEM',
    id: itemTempId(item.id),
    item_data: {
      name: itemData.name,
      description: itemData.description,
      product_type: itemData.product_type,
      ecom_visibility: itemData.ecom_visibility,
      present_at_all_locations: true,
      categories: (itemData.categories || []).map(category => ({ type: 'CATEGORY', id: categoryTempId(category.id) })),
      variations: (itemData.variations || []).map(variation => {
        const variationData = variation.item_variation_data || {}
        return {
          type: 'ITEM_VARIATION',
          id: variationTempId(variation.id),
          item_variation_data: {
            name: variationData.name,
            sku: variationData.sku,
            upc: variationData.upc,
            pricing_type: variationData.pricing_type,
            price_money: variationData.price_money,
            track_inventory: variationData.track_inventory,
            sellable: variationData.sellable,
            stockable: variationData.stockable,
          },
        }
      }),
    },
  }
}

async function main() {
  console.log(`Reading production catalog (${prodClient.environment})...`)
  const prodCategories = await listAll(prodClient, 'CATEGORY')
  const prodItems = await listAll(prodClient, 'ITEM')
  console.log(`  ${prodCategories.length} categories, ${prodItems.length} items`)

  const prodTrackedVariationIds = prodItems.flatMap(item =>
    (item.item_data?.variations || [])
      .filter(variation => variation.item_variation_data?.track_inventory)
      .map(variation => variation.id)
  )

  if (COPY_INVENTORY && !prodClient.locationId) {
    console.log('\n--with-inventory requires SQUARE_LOCATION_ID to read production counts — skipping inventory copy.')
  }

  console.log(`Reading existing sandbox catalog (${sandboxClient.environment})...`)
  const existingSandbox = [...(await listAll(sandboxClient, 'ITEM')), ...(await listAll(sandboxClient, 'CATEGORY'))]
  console.log(`  ${existingSandbox.length} existing sandbox objects would be deleted first`)

  if (!APPLY) {
    console.log('\nPreview only — rerun with --apply to actually wipe sandbox and copy the catalog over.')
    if (COPY_INVENTORY) {
      console.log(`--with-inventory would also copy on-hand counts for ${prodTrackedVariationIds.length} tracked production variation(s).`)
    }
    return
  }

  if (existingSandbox.length > 0) {
    console.log(`Deleting ${existingSandbox.length} existing sandbox objects...`)
    for (const batch of chunk(existingSandbox.map(o => o.id), DELETE_BATCH_SIZE)) {
      await sandboxClient.request('/v2/catalog/batch-delete', { method: 'POST', body: { object_ids: batch } })
    }
  }

  const newCategories = prodCategories.map(buildSandboxCategory)
  const newItems = prodItems.map(buildSandboxItem)

  console.log(`Creating ${newCategories.length} categories + ${newItems.length} items in sandbox...`)
  const result = await sandboxClient.request('/v2/catalog/batch-upsert', {
    method: 'POST',
    body: {
      idempotency_key: crypto.randomUUID(),
      batches: [{ objects: [...newCategories, ...newItems] }],
    },
  })

  if (result.errors?.length) {
    console.error('Square reported errors during upsert:')
    console.error(JSON.stringify(result.errors, null, 2))
    process.exitCode = 1
  }

  console.log(`Done — ${result.objects?.length || 0} objects created in sandbox.`)

  if (COPY_INVENTORY && prodClient.locationId && sandboxClient.locationId && prodTrackedVariationIds.length > 0) {
    console.log(`\nReading production on-hand counts for ${prodTrackedVariationIds.length} tracked variation(s)...`)
    const prodCounts = await fetchInventoryCounts(prodClient, prodTrackedVariationIds, prodClient.locationId)
    const quantityByProdVariationId = new Map(prodCounts.map(count => [count.catalog_object_id, Number(count.quantity)]))

    // batch-upsert's id_mappings resolves every temp id (e.g. `#var-<prodId>`)
    // used above to the real sandbox id Square assigned it.
    const idMappings = new Map((result.id_mappings || []).map(m => [m.client_object_id, m.object_id]))

    const changes = prodTrackedVariationIds
      .map(prodVariationId => {
        const sandboxVariationId = idMappings.get(variationTempId(prodVariationId))
        if (!sandboxVariationId) return null
        return { variationId: sandboxVariationId, quantity: quantityByProdVariationId.get(prodVariationId) ?? 0 }
      })
      .filter(Boolean)

    console.log(`Copying on-hand counts into sandbox for ${changes.length} variation(s)...`)
    for (const batch of chunk(changes, INVENTORY_BATCH_SIZE)) {
      const occurredAt = new Date().toISOString()
      await sandboxClient.request('/v2/inventory/batch-change', {
        method: 'POST',
        body: {
          idempotency_key: crypto.randomUUID(),
          ignore_unchanged_counts: true,
          changes: batch.map(({ variationId, quantity }) => ({
            type: 'PHYSICAL_COUNT',
            physical_count: {
              catalog_object_id: variationId,
              location_id: sandboxClient.locationId,
              state: 'IN_STOCK',
              quantity: String(quantity),
              occurred_at: occurredAt,
            },
          })),
        },
      })
    }
    console.log('Done — sandbox inventory now mirrors production quantities.')
  }
}

main().catch(error => {
  console.error('Sync failed:', error.message)
  process.exit(1)
})
