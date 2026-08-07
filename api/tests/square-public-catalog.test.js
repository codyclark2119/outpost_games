import test from 'node:test'
import assert from 'node:assert/strict'

import { getPublicSquareCatalog } from '../squarePosClient.js'

const FAKE_ENV = { SQUARE_ACCESS_TOKEN: 'fake-token', SQUARE_ENV: 'sandbox' }

const withMockedFetch = async (responses, run) => {
  const original = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options })
    const next = responses.shift()
    return {
      ok: next.ok !== false,
      status: next.status || (next.ok === false ? 400 : 200),
      json: async () => next.body,
    }
  }
  try {
    return await run(calls)
  } finally {
    globalThis.fetch = original
  }
}

const categoryObject = (id, { name, parentCategoryId } = {}) => ({
  id,
  type: 'CATEGORY',
  category_data: {
    name,
    ...(parentCategoryId ? { parent_category: { id: parentCategoryId } } : {}),
  },
})

const itemObject = (
  id,
  { name, categoryId, priceCents = 500, hiddenFromWeb = false, createdAt, releasedAt }
) => ({
  id,
  type: 'ITEM',
  ...(createdAt ? { created_at: createdAt } : {}),
  item_data: {
    name,
    categories: [{ id: categoryId }],
    variations: [
      {
        id: `${id}-VAR1`,
        item_variation_data: {
          name: 'Regular',
          price_money: { amount: priceCents, currency: 'USD' },
          track_inventory: false,
          sellable: true,
        },
      },
    ],
  },
  ...((hiddenFromWeb || releasedAt) && {
    custom_attribute_values: {
      ...(hiddenFromWeb ? { outpost_hide_from_web: { boolean_value: true } } : {}),
      ...(releasedAt
        ? { outpost_released_at: { key: 'outpost_released_at', type: 'STRING', string_value: releasedAt } }
        : {}),
    },
  }),
})

test('getPublicSquareCatalog exposes setId/setName for an item in a real subcategory ("set")', async () => {
  const responses = [
    // listSquareCatalogItems -> /v2/catalog/list?types=ITEM,IMAGE
    { ok: true, body: { objects: [itemObject('ITEM1', { name: 'Bloomburrow Precon', categoryId: 'CAT_LEAF' })] } },
    // resolveTopLevelCategoryMap -> /v2/catalog/list?types=CATEGORY
    {
      ok: true,
      body: {
        objects: [
          categoryObject('CAT_TOP', { name: 'Magic' }),
          categoryObject('CAT_LEAF', { name: 'Bloomburrow', parentCategoryId: 'CAT_TOP' }),
        ],
      },
    },
  ]

  await withMockedFetch(responses, async () => {
    const { items } = await getPublicSquareCatalog(FAKE_ENV)
    assert.equal(items.length, 1)
    assert.equal(items[0].categoryId, 'CAT_TOP')
    assert.equal(items[0].categoryName, 'Magic')
    assert.equal(items[0].setId, 'CAT_LEAF')
    assert.equal(items[0].setName, 'Bloomburrow')
  })
})

test('getPublicSquareCatalog leaves setId/setName null for an item assigned directly to a top-level category', async () => {
  const responses = [
    { ok: true, body: { objects: [itemObject('ITEM1', { name: 'Playmat', categoryId: 'CAT_TOP' })] } },
    { ok: true, body: { objects: [categoryObject('CAT_TOP', { name: 'Magic' })] } },
  ]

  await withMockedFetch(responses, async () => {
    const { items } = await getPublicSquareCatalog(FAKE_ENV)
    assert.equal(items.length, 1)
    assert.equal(items[0].categoryName, 'Magic')
    assert.equal(items[0].setId, null)
    assert.equal(items[0].setName, null)
  })
})

test('getPublicSquareCatalog excludes items in the Accessories category, same as Snacks', async () => {
  const responses = [
    {
      ok: true,
      body: {
        objects: [
          itemObject('ITEM1', { name: 'Playmat', categoryId: 'CAT_ACCESSORIES' }),
          itemObject('ITEM2', { name: 'Booster Pack', categoryId: 'CAT_MAGIC' }),
        ],
      },
    },
    {
      ok: true,
      body: {
        objects: [
          categoryObject('CAT_ACCESSORIES', { name: 'Accessories' }),
          categoryObject('CAT_MAGIC', { name: 'Magic' }),
        ],
      },
    },
  ]

  await withMockedFetch(responses, async () => {
    const { items } = await getPublicSquareCatalog(FAKE_ENV)
    assert.equal(items.length, 1)
    assert.equal(items[0].name, 'Booster Pack')
  })
})

test('getPublicSquareCatalog excludes items flagged outpost_hide_from_web even when in stock and sellable', async () => {
  const responses = [
    {
      ok: true,
      body: {
        objects: [
          itemObject('ITEM1', { name: 'Hidden Precon', categoryId: 'CAT_MAGIC', hiddenFromWeb: true }),
          itemObject('ITEM2', { name: 'Regular Precon', categoryId: 'CAT_MAGIC' }),
        ],
      },
    },
    { ok: true, body: { objects: [categoryObject('CAT_MAGIC', { name: 'Magic' })] } },
  ]

  await withMockedFetch(responses, async () => {
    const { items } = await getPublicSquareCatalog(FAKE_ENV)
    assert.equal(items.length, 1)
    assert.equal(items[0].name, 'Regular Precon')
  })
})

test('getPublicSquareCatalog orders items within a category newest-first, with missing created_at sorted last', async () => {
  const responses = [
    {
      ok: true,
      body: {
        objects: [
          itemObject('ITEM1', { name: 'Oldest', categoryId: 'CAT_MAGIC', createdAt: '2026-01-01T00:00:00.000Z' }),
          itemObject('ITEM2', { name: 'No Date', categoryId: 'CAT_MAGIC' }),
          itemObject('ITEM3', { name: 'Newest', categoryId: 'CAT_MAGIC', createdAt: '2026-06-01T00:00:00.000Z' }),
          itemObject('ITEM4', { name: 'Middle', categoryId: 'CAT_MAGIC', createdAt: '2026-03-01T00:00:00.000Z' }),
        ],
      },
    },
    { ok: true, body: { objects: [categoryObject('CAT_MAGIC', { name: 'Magic' })] } },
  ]

  await withMockedFetch(responses, async () => {
    const { items } = await getPublicSquareCatalog(FAKE_ENV)
    assert.deepEqual(
      items.map(i => i.name),
      ['Newest', 'Middle', 'Oldest', 'No Date']
    )
    assert.equal(items[0].itemCreatedAt, '2026-06-01T00:00:00.000Z')
  })
})

test('getPublicSquareCatalog prefers the admin-set releasedAt over Square\'s own created_at when ranking', async () => {
  const responses = [
    {
      ok: true,
      body: {
        objects: [
          // Created recently in Square (e.g. a bulk cleanup), but staff marked
          // its real release date as long ago — should NOT rank as newest.
          itemObject('ITEM1', {
            name: 'Old Product, Recently Touched In Square',
            categoryId: 'CAT_MAGIC',
            createdAt: '2026-07-24T00:00:00.000Z',
            releasedAt: '2025-01-01',
          }),
          // Created long ago in Square, but staff marked it as just released —
          // should rank as newest despite the old created_at.
          itemObject('ITEM2', {
            name: 'Genuinely New Arrival',
            categoryId: 'CAT_MAGIC',
            createdAt: '2025-09-18T00:00:00.000Z',
            releasedAt: '2026-08-01',
          }),
          // No releasedAt set at all — falls back to created_at.
          itemObject('ITEM3', {
            name: 'No Manual Override',
            categoryId: 'CAT_MAGIC',
            createdAt: '2026-06-01T00:00:00.000Z',
          }),
        ],
      },
    },
    { ok: true, body: { objects: [categoryObject('CAT_MAGIC', { name: 'Magic' })] } },
  ]

  await withMockedFetch(responses, async () => {
    const { items } = await getPublicSquareCatalog(FAKE_ENV)
    assert.deepEqual(
      items.map(i => i.name),
      ['Genuinely New Arrival', 'No Manual Override', 'Old Product, Recently Touched In Square']
    )
    assert.equal(items[0].releasedAt, '2026-08-01')
    assert.equal(items[2].releasedAt, '2025-01-01')
  })
})
