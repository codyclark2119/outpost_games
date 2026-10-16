#!/usr/bin/env node
// Read-only snapshot of the Square catalog for cleanup analysis: every
// category, item and variation (raw catalog fields), the IN_STOCK count of
// every variation, and the line items of every completed order. Nothing is
// written to Square: catalog/list and the two POST endpoints used here
// (inventory batch-retrieve, orders search) only read.
//
// The output is what scripts/catalog-audit.js reads to find duplicate
// listings, which of a duplicate pair has actually sold, and stray items.
//
// Usage:
//   node scripts/catalog-snapshot.js                 # production (default)
//   node scripts/catalog-snapshot.js --env sandbox
//   node scripts/catalog-snapshot.js --since 2023-01-01
//
// Writes api/data/catalog-snapshot/snapshot-YYYY-MM-DD.json (git-ignored).

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSquarePosClient, loadSquareEnvironment } from '../squarePosClient.js'

loadSquareEnvironment()

const argValue = flag => {
  const index = process.argv.indexOf(flag)
  return index === -1 ? null : process.argv[index + 1]
}

const environment = argValue('--env') || 'production'
const since = argValue('--since') || '2015-01-01'
const client = createSquarePosClient({ environment })

const outDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'data',
  'catalog-snapshot'
)

const listCatalog = async () => {
  const objects = []
  let cursor
  do {
    const query = new URLSearchParams({ types: 'ITEM,CATEGORY' })
    if (cursor) query.set('cursor', cursor)
    const payload = await client.request(`/v2/catalog/list?${query.toString()}`)
    objects.push(...(payload.objects || []))
    cursor = payload.cursor
  } while (cursor)
  return objects
}

const listCounts = async variationIds => {
  const counts = []
  for (let i = 0; i < variationIds.length; i += 100) {
    const payload = await client.request('/v2/inventory/counts/batch-retrieve', {
      method: 'POST',
      body: {
        catalog_object_ids: variationIds.slice(i, i + 100),
        ...(client.locationId ? { location_ids: [client.locationId] } : {}),
        states: ['IN_STOCK'],
      },
    })
    counts.push(...(payload.counts || []))
  }
  return counts
}

const listOrderLines = async () => {
  const lines = []
  let cursor
  do {
    const payload = await client.request('/v2/orders/search', {
      method: 'POST',
      body: {
        location_ids: [client.locationId],
        query: {
          filter: {
            state_filter: { states: ['COMPLETED'] },
            date_time_filter: {
              closed_at: {
                start_at: new Date(since).toISOString(),
                end_at: new Date().toISOString(),
              },
            },
          },
          sort: { sort_field: 'CLOSED_AT', sort_order: 'ASC' },
        },
        limit: 500,
        ...(cursor ? { cursor } : {}),
      },
    })
    for (const order of payload.orders || []) {
      for (const line of order.line_items || []) {
        lines.push({
          orderId: order.id,
          closedAt: order.closed_at,
          catalogObjectId: line.catalog_object_id || null,
          name: line.name || null,
          variationName: line.variation_name || null,
          quantity: Number(line.quantity) || 0,
          grossCents: line.gross_sales_money?.amount ?? null,
        })
      }
    }
    cursor = payload.cursor
    process.stdout.write(`\r  ${lines.length} order lines`)
  } while (cursor)
  process.stdout.write('\n')
  return lines
}

console.log(`Reading the ${environment} Square catalog (read-only)…`)
const objects = await listCatalog()
const categories = objects.filter(object => object.type === 'CATEGORY')
const items = objects.filter(object => object.type === 'ITEM')
const variationIds = items.flatMap(item => (item.item_data?.variations || []).map(v => v.id))
console.log(
  `  ${categories.length} categories, ${items.length} items, ${variationIds.length} variations`
)

const counts = await listCounts(variationIds)
console.log(`  ${counts.length} inventory counts`)

console.log(`Reading completed orders since ${since}…`)
const orderLines = await listOrderLines()

fs.mkdirSync(outDir, { recursive: true })
const outFile = path.join(outDir, `snapshot-${new Date().toISOString().slice(0, 10)}.json`)
fs.writeFileSync(
  outFile,
  JSON.stringify({
    takenAt: new Date().toISOString(),
    environment,
    since,
    categories,
    items,
    counts,
    orderLines,
  })
)
console.log(`Wrote ${outFile}`)
