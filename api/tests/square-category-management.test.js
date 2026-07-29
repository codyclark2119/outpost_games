import test from 'node:test'
import assert from 'node:assert/strict'

import {
  renameSquareCategory,
  reparentSquareCategory,
  deleteSquareCategory,
  mergeSquareCategories,
} from '../squarePosClient.js'

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

const categoryObject = (id, { name = `Category ${id}`, parentCategoryId } = {}) => ({
  id,
  type: 'CATEGORY',
  version: 1,
  category_data: {
    name,
    ...(parentCategoryId ? { parent_category: { type: 'CATEGORY', id: parentCategoryId } } : {}),
  },
})

const itemObject = (id, { categoryIds = ['CAT_FROM'], reporting_category, tax_ids = ['TAX1'] } = {}) => ({
  id,
  type: 'ITEM',
  version: 1,
  item_data: {
    name: `Item ${id}`,
    tax_ids,
    categories: categoryIds.map(catId => ({ id: catId })),
    ...(reporting_category ? { reporting_category } : {}),
    variations: [
      { id: `${id}-VAR1`, type: 'ITEM_VARIATION', item_variation_data: { name: 'Regular', sellable: true } },
    ],
  },
})

test('renameSquareCategory updates only category_data.name', async () => {
  const responses = [
    { ok: true, body: { object: categoryObject('CAT1', { name: 'Old Name' }) } },
    { ok: true, body: { catalog_object: categoryObject('CAT1', { name: 'New Name' }) } },
  ]

  await withMockedFetch(responses, async calls => {
    await renameSquareCategory('CAT1', 'New Name', FAKE_ENV)
    const sentObject = JSON.parse(calls[1].options.body).object
    assert.equal(sentObject.category_data.name, 'New Name')
    assert.equal(sentObject.id, 'CAT1')
  })
})

test('reparentSquareCategory sets parent_category, and null removes it', async () => {
  const responses = [
    { ok: true, body: { object: categoryObject('CAT1') } },
    { ok: true, body: { catalog_object: categoryObject('CAT1', { parentCategoryId: 'CAT_PARENT' }) } },
  ]

  await withMockedFetch(responses, async calls => {
    await reparentSquareCategory('CAT1', 'CAT_PARENT', FAKE_ENV)
    const sentObject = JSON.parse(calls[1].options.body).object
    assert.deepEqual(sentObject.category_data.parent_category, { type: 'CATEGORY', id: 'CAT_PARENT' })
  })

  const removalResponses = [
    { ok: true, body: { object: categoryObject('CAT1', { parentCategoryId: 'CAT_PARENT' }) } },
    { ok: true, body: { catalog_object: categoryObject('CAT1') } },
  ]
  await withMockedFetch(removalResponses, async calls => {
    await reparentSquareCategory('CAT1', null, FAKE_ENV)
    const sentObject = JSON.parse(calls[1].options.body).object
    assert.equal('parent_category' in sentObject.category_data, false)
  })
})

test('deleteSquareCategory refuses when items still reference it (no DELETE call made)', async () => {
  const responses = [
    // listSquareCatalogItems -> /v2/catalog/list (types ITEM,IMAGE)
    { ok: true, body: { objects: [itemObject('ITEM1', { categoryIds: ['CAT1'] })] } },
    // fetchAllCategoryObjects -> /v2/catalog/list (types CATEGORY)
    { ok: true, body: { objects: [categoryObject('CAT1')] } },
  ]

  await withMockedFetch(responses, async calls => {
    await assert.rejects(() => deleteSquareCategory('CAT1', FAKE_ENV), /1 item\(s\)/)
    assert.equal(calls.length, 2) // never reaches the DELETE call
  })
})

test('deleteSquareCategory refuses when it still has child categories (no DELETE call made)', async () => {
  const responses = [
    { ok: true, body: { objects: [] } }, // no items reference it
    { ok: true, body: { objects: [categoryObject('CAT1'), categoryObject('CAT_CHILD', { parentCategoryId: 'CAT1' })] } },
  ]

  await withMockedFetch(responses, async calls => {
    await assert.rejects(() => deleteSquareCategory('CAT1', FAKE_ENV), /sub-category/)
    assert.equal(calls.length, 2)
  })
})

test('deleteSquareCategory succeeds when unreferenced and childless', async () => {
  const responses = [
    { ok: true, body: { objects: [] } },
    { ok: true, body: { objects: [categoryObject('CAT1')] } },
    { ok: true, body: { success: true } }, // DELETE
  ]

  await withMockedFetch(responses, async calls => {
    await deleteSquareCategory('CAT1', FAKE_ENV)
    assert.equal(calls.length, 3)
    assert.equal(calls[2].options.method, 'DELETE')
    assert.match(calls[2].url, /\/v2\/catalog\/object\/CAT1$/)
  })
})

test('mergeSquareCategories rejects merging a category into itself with no calls made', async () => {
  await assert.rejects(() => mergeSquareCategories('CAT1', 'CAT1', FAKE_ENV), /itself/)
})

test('mergeSquareCategories reassigns every affected item then deletes the source category', async () => {
  const responses = [
    // listSquareCatalogItems -> find items referencing CAT_FROM
    {
      ok: true,
      body: {
        objects: [
          itemObject('ITEM1', { categoryIds: ['CAT_FROM'], reporting_category: { id: 'CAT_FROM' } }),
          itemObject('ITEM2', { categoryIds: ['CAT_FROM', 'CAT_OTHER'] }),
        ],
      },
    },
    // batchRetrieveSquareCatalogObjects
    {
      ok: true,
      body: {
        objects: [
          itemObject('ITEM1', { categoryIds: ['CAT_FROM'], reporting_category: { id: 'CAT_FROM' } }),
          itemObject('ITEM2', { categoryIds: ['CAT_FROM', 'CAT_OTHER'] }),
        ],
      },
    },
    // batchUpsertSquareCatalogObjects
    { ok: true, body: { objects: [], id_mappings: [] } },
    // deleteSquareCategory's internal listSquareCatalogItems check (now clear)
    { ok: true, body: { objects: [] } },
    // deleteSquareCategory's fetchAllCategoryObjects check
    { ok: true, body: { objects: [categoryObject('CAT_FROM')] } },
    // DELETE
    { ok: true, body: { success: true } },
  ]

  await withMockedFetch(responses, async calls => {
    const result = await mergeSquareCategories('CAT_FROM', 'CAT_TO', FAKE_ENV)
    assert.equal(result.mergedItemCount, 2)

    const upsertBody = JSON.parse(calls[2].options.body)
    const sentObjects = upsertBody.batches[0].objects
    const item1 = sentObjects.find(object => object.id === 'ITEM1')
    const item2 = sentObjects.find(object => object.id === 'ITEM2')

    assert.deepEqual(item1.item_data.categories, [{ id: 'CAT_TO' }])
    assert.deepEqual(item1.item_data.reporting_category, { id: 'CAT_TO' })
    // ITEM2 had an unrelated category too — it survives, deduped, alongside the new one.
    assert.deepEqual(item2.item_data.categories, [{ id: 'CAT_TO' }, { id: 'CAT_OTHER' }])

    assert.equal(calls[5].options.method, 'DELETE')
    assert.match(calls[5].url, /\/v2\/catalog\/object\/CAT_FROM$/)
  })
})

test('mergeSquareCategories handles the zero-affected-items case (still deletes the source category)', async () => {
  const responses = [
    { ok: true, body: { objects: [] } }, // no items reference CAT_FROM
    { ok: true, body: { objects: [] } }, // deleteSquareCategory's item check
    { ok: true, body: { objects: [categoryObject('CAT_FROM')] } }, // deleteSquareCategory's category check
    { ok: true, body: { success: true } }, // DELETE
  ]

  await withMockedFetch(responses, async calls => {
    const result = await mergeSquareCategories('CAT_FROM', 'CAT_TO', FAKE_ENV)
    assert.equal(result.mergedItemCount, 0)
    assert.equal(calls.length, 4) // no batch-retrieve/upsert calls made at all
    assert.equal(calls[3].options.method, 'DELETE')
  })
})
