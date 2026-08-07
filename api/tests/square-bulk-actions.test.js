import test from 'node:test'
import assert from 'node:assert/strict'

import {
  deleteSquareCatalogItemsBatch,
  setSquareCatalogItemsCategoryBatch,
  setSquareCatalogItemsVisibilityBatch,
  setSquareCatalogItemsReleasedAtBatch,
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

const itemObject = (id, { categories = [{ id: 'CAT_OLD' }], reporting_category, tax_ids = ['TAX1'] } = {}) => ({
  id,
  type: 'ITEM',
  version: 1,
  item_data: {
    name: `Item ${id}`,
    tax_ids,
    categories,
    ...(reporting_category ? { reporting_category } : {}),
    variations: [
      { id: `${id}-VAR1`, type: 'ITEM_VARIATION', item_variation_data: { name: 'Regular', sellable: true } },
      { id: `${id}-VAR2`, type: 'ITEM_VARIATION', item_variation_data: { name: 'Foil', sellable: false } },
    ],
  },
})

test('deleteSquareCatalogItemsBatch passes through to batch-delete unchanged', async () => {
  const responses = [{ ok: true, body: { deleted_object_ids: ['ITEM1', 'ITEM2'] } }]

  await withMockedFetch(responses, async calls => {
    const { deletedIds } = await deleteSquareCatalogItemsBatch(['ITEM1', 'ITEM2'], FAKE_ENV)
    assert.deepEqual(JSON.parse(calls[0].options.body).object_ids, ['ITEM1', 'ITEM2'])
    assert.deepEqual(deletedIds, ['ITEM1', 'ITEM2'])
  })
})

test('setSquareCatalogItemsCategoryBatch sets categories/reporting_category on every item, leaving unrelated fields untouched', async () => {
  const responses = [
    {
      ok: true,
      body: {
        objects: [
          itemObject('ITEM1', { reporting_category: { id: 'CAT_OLD' } }),
          itemObject('ITEM2', { reporting_category: { id: 'CAT_OLD' } }),
        ],
      },
    },
    { ok: true, body: { objects: [], id_mappings: [] } },
  ]

  await withMockedFetch(responses, async calls => {
    await setSquareCatalogItemsCategoryBatch(['ITEM1', 'ITEM2'], 'CAT_NEW', FAKE_ENV)

    const upsertBody = JSON.parse(calls[1].options.body)
    const sentObjects = upsertBody.batches[0].objects
    assert.equal(sentObjects.length, 2)
    for (const object of sentObjects) {
      assert.deepEqual(object.item_data.categories, [{ id: 'CAT_NEW' }])
      assert.deepEqual(object.item_data.reporting_category, { id: 'CAT_NEW' })
      assert.deepEqual(object.item_data.tax_ids, ['TAX1']) // untouched
    }
  })
})

test('setSquareCatalogItemsCategoryBatch clears categorization when categoryId is null', async () => {
  const responses = [
    { ok: true, body: { objects: [itemObject('ITEM1', { reporting_category: { id: 'CAT_OLD' } })] } },
    { ok: true, body: { objects: [], id_mappings: [] } },
  ]

  await withMockedFetch(responses, async calls => {
    await setSquareCatalogItemsCategoryBatch(['ITEM1'], null, FAKE_ENV)

    const sentObject = JSON.parse(calls[1].options.body).batches[0].objects[0]
    assert.deepEqual(sentObject.item_data.categories, [])
    assert.equal('reporting_category' in sentObject.item_data, false)
  })
})

test('setSquareCatalogItemsVisibilityBatch cascades sellable to every variation within each item', async () => {
  const responses = [
    { ok: true, body: { objects: [itemObject('ITEM1'), itemObject('ITEM2')] } },
    { ok: true, body: { objects: [], id_mappings: [] } },
  ]

  await withMockedFetch(responses, async calls => {
    await setSquareCatalogItemsVisibilityBatch(['ITEM1', 'ITEM2'], { sellable: false }, FAKE_ENV)

    const sentObjects = JSON.parse(calls[1].options.body).batches[0].objects
    for (const object of sentObjects) {
      for (const variation of object.item_data.variations) {
        assert.equal(variation.item_variation_data.sellable, false)
      }
    }
  })
})

test('setSquareCatalogItemsVisibilityBatch sets hiddenFromWeb (outpost_hide_from_web) independently without touching variations', async () => {
  const responses = [
    { ok: true, body: { objects: [itemObject('ITEM1')] } },
    { ok: true, body: { objects: [], id_mappings: [] } },
  ]

  await withMockedFetch(responses, async calls => {
    await setSquareCatalogItemsVisibilityBatch(['ITEM1'], { hiddenFromWeb: true }, FAKE_ENV)

    const sentObject = JSON.parse(calls[1].options.body).batches[0].objects[0]
    assert.equal(sentObject.custom_attribute_values.outpost_hide_from_web.boolean_value, true)
    // sellable values from the fixture (true, false) survive untouched since sellable wasn't passed.
    assert.equal(sentObject.item_data.variations[0].item_variation_data.sellable, true)
    assert.equal(sentObject.item_data.variations[1].item_variation_data.sellable, false)
  })
})

test('setSquareCatalogItemsVisibilityBatch clears hiddenFromWeb when set back to false', async () => {
  const responses = [
    {
      ok: true,
      body: {
        objects: [
          {
            ...itemObject('ITEM1'),
            custom_attribute_values: {
              outpost_hide_from_web: { key: 'outpost_hide_from_web', type: 'BOOLEAN', boolean_value: true },
            },
          },
        ],
      },
    },
    { ok: true, body: { objects: [], id_mappings: [] } },
  ]

  await withMockedFetch(responses, async calls => {
    await setSquareCatalogItemsVisibilityBatch(['ITEM1'], { hiddenFromWeb: false }, FAKE_ENV)

    const sentObject = JSON.parse(calls[1].options.body).batches[0].objects[0]
    assert.equal('outpost_hide_from_web' in (sentObject.custom_attribute_values || {}), false)
  })
})

test('setSquareCatalogItemsReleasedAtBatch sets outpost_released_at on every item, leaving variations untouched', async () => {
  const responses = [
    { ok: true, body: { objects: [itemObject('ITEM1'), itemObject('ITEM2')] } },
    { ok: true, body: { objects: [], id_mappings: [] } },
  ]

  await withMockedFetch(responses, async calls => {
    await setSquareCatalogItemsReleasedAtBatch(['ITEM1', 'ITEM2'], '2026-08-01', FAKE_ENV)

    const sentObjects = JSON.parse(calls[1].options.body).batches[0].objects
    for (const object of sentObjects) {
      assert.equal(object.custom_attribute_values.outpost_released_at.string_value, '2026-08-01')
      assert.equal(object.custom_attribute_values.outpost_released_at.type, 'STRING')
      // untouched
      assert.equal(object.item_data.variations[0].item_variation_data.sellable, true)
    }
  })
})

test('setSquareCatalogItemsReleasedAtBatch clears outpost_released_at when passed null', async () => {
  const responses = [
    {
      ok: true,
      body: {
        objects: [
          {
            ...itemObject('ITEM1'),
            custom_attribute_values: {
              outpost_released_at: { key: 'outpost_released_at', type: 'STRING', string_value: '2026-01-01' },
            },
          },
        ],
      },
    },
    { ok: true, body: { objects: [], id_mappings: [] } },
  ]

  await withMockedFetch(responses, async calls => {
    await setSquareCatalogItemsReleasedAtBatch(['ITEM1'], null, FAKE_ENV)

    const sentObject = JSON.parse(calls[1].options.body).batches[0].objects[0]
    assert.equal('outpost_released_at' in (sentObject.custom_attribute_values || {}), false)
  })
})
