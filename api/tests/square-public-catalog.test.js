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

const itemObject = (id, { name, categoryId, priceCents = 500, hiddenFromWeb = false }) => ({
  id,
  type: 'ITEM',
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
  ...(hiddenFromWeb
    ? { custom_attribute_values: { outpost_hide_from_web: { boolean_value: true } } }
    : {}),
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
