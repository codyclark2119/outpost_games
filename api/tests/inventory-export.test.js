import test from 'node:test'
import assert from 'node:assert/strict'

import {
  sortForExport,
  statusLabel,
  daysInCatalog,
  EXCLUDED_EXPORT_CATEGORIES,
  buildInventoryWorkbook,
} from '../inventoryExport.js'

const item = overrides => ({
  id: 'VAR1',
  itemId: 'ITEM1',
  displayName: 'Test Item',
  sku: 'SKU1',
  priceCents: 500,
  currency: 'USD',
  trackInventory: true,
  sellable: true,
  quantity: 5,
  state: 'IN_STOCK',
  inStock: true,
  source: 'square',
  categoryId: 'CAT1',
  categoryName: 'Magic',
  itemCreatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

test('sortForExport puts in-stock items before out-of-stock/not-tracked items', () => {
  const items = [
    item({ displayName: 'Out of stock', inStock: false, quantity: 0 }),
    item({ displayName: 'In stock', inStock: true, quantity: 5 }),
  ]
  const sorted = sortForExport(items)
  assert.deepEqual(sorted.map(i => i.displayName), ['In stock', 'Out of stock'])
})

test('sortForExport groups by category name alphabetically within the same stock status', () => {
  const items = [
    item({ displayName: 'Pokemon item', categoryName: 'Pokemon', inStock: true }),
    item({ displayName: 'Magic item', categoryName: 'Magic', inStock: true }),
  ]
  const sorted = sortForExport(items)
  assert.deepEqual(sorted.map(i => i.displayName), ['Magic item', 'Pokemon item'])
})

test('sortForExport sorts lowest quantity first within a category', () => {
  const items = [
    item({ displayName: 'High stock', categoryName: 'Magic', quantity: 40 }),
    item({ displayName: 'Low stock', categoryName: 'Magic', quantity: 2 }),
  ]
  const sorted = sortForExport(items)
  assert.deepEqual(sorted.map(i => i.displayName), ['Low stock', 'High stock'])
})

test('sortForExport treats untracked (null) quantity as highest, sorting it last', () => {
  const items = [
    item({ displayName: 'Not tracked', categoryName: 'Magic', quantity: null, trackInventory: false }),
    item({ displayName: 'Tracked low', categoryName: 'Magic', quantity: 1 }),
  ]
  const sorted = sortForExport(items)
  assert.deepEqual(sorted.map(i => i.displayName), ['Tracked low', 'Not tracked'])
})

test('EXCLUDED_EXPORT_CATEGORIES contains Snacks so it can be filtered out of the export', () => {
  assert.deepEqual(EXCLUDED_EXPORT_CATEGORIES, ['Snacks'])
})

test('statusLabel reflects trackInventory/inStock combinations', () => {
  assert.equal(statusLabel(item({ trackInventory: false })), 'Not Tracked')
  assert.equal(statusLabel(item({ trackInventory: true, inStock: true })), 'In Stock')
  assert.equal(statusLabel(item({ trackInventory: true, inStock: false })), 'Out of Stock')
})

test('daysInCatalog computes whole days since itemCreatedAt', () => {
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  assert.equal(daysInCatalog(item({ itemCreatedAt: tenDaysAgo })), 10)
  assert.equal(daysInCatalog(item({ itemCreatedAt: null })), '')
})

test('buildInventoryWorkbook excludes Snacks and writes rows sorted by stock/category/quantity', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async url => {
    const urlStr = String(url)
    if (urlStr.includes('/v2/catalog/list?types=CATEGORY')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          objects: [
            { id: 'CAT_MAGIC', category_data: { name: 'Magic' } },
            { id: 'CAT_SNACK', category_data: { name: 'Snacks' } },
          ],
        }),
      }
    }
    if (urlStr.includes('/v2/catalog/list?types=ITEM')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          objects: [
            {
              id: 'ITEM1',
              item_data: {
                name: 'Booster Pack',
                categories: [{ id: 'CAT_MAGIC' }],
                variations: [
                  {
                    id: 'VAR1',
                    item_variation_data: {
                      sku: 'SKU-MAGIC',
                      price_money: { amount: 500, currency: 'USD' },
                      track_inventory: false,
                      sellable: true,
                    },
                  },
                ],
              },
            },
            {
              id: 'ITEM2',
              item_data: {
                name: 'Chips',
                categories: [{ id: 'CAT_SNACK' }],
                variations: [
                  {
                    id: 'VAR2',
                    item_variation_data: {
                      sku: 'SKU-SNACK',
                      price_money: { amount: 200, currency: 'USD' },
                      track_inventory: false,
                      sellable: true,
                    },
                  },
                ],
              },
            },
          ],
        }),
      }
    }
    throw new Error(`Unexpected fetch: ${urlStr}`)
  }

  try {
    const { buffer, itemCount } = await buildInventoryWorkbook({
      SQUARE_ACCESS_TOKEN: 'fake-token',
      SQUARE_ENV: 'sandbox',
    })
    assert.equal(itemCount, 1)
    assert.ok(buffer.byteLength > 0)
  } finally {
    globalThis.fetch = originalFetch
  }
})
