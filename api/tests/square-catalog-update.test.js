import test from 'node:test'
import assert from 'node:assert/strict'

import { updateSquareCatalogItem, deleteSquareCatalogVariation, SquareVersionMismatchError } from '../squarePosClient.js'

const FAKE_ENV = { SQUARE_ACCESS_TOKEN: 'fake-token', SQUARE_ENV: 'sandbox' }

const singleVariationObject = () => ({
  object: {
    type: 'ITEM',
    id: 'ITEM123',
    version: 111,
    is_deleted: false,
    catalog_v1_ids: [{ catalog_v1_id: 'V1', location_id: 'LOC1' }],
    present_at_all_locations: false,
    present_at_location_ids: ['LOC1'],
    item_data: {
      name: 'Old Name',
      description: 'Old description',
      tax_ids: ['TAX1'],
      image_ids: ['IMG1'],
      categories: [{ id: 'CAT_OLD', ordinal: 1 }],
      reporting_category: { id: 'CAT_OLD', ordinal: 1 },
      ecom_visibility: 'VISIBLE',
      custom_attribute_values: { foo: { string_value: 'bar' } },
      variations: [
        {
          type: 'ITEM_VARIATION',
          id: 'VAR123',
          version: 222,
          item_variation_data: {
            item_id: 'ITEM123',
            name: 'Regular',
            sku: 'KEEP-ME-1234',
            price_money: { amount: 500, currency: 'USD' },
            track_inventory: true,
            sellable: true,
            stockable: true,
          },
        },
      ],
    },
  },
  related_objects: [],
})

const multiVariationObject = () => {
  const single = singleVariationObject()
  single.object.item_data.variations.push({
    type: 'ITEM_VARIATION',
    id: 'VAR456',
    version: 333,
    item_variation_data: { item_id: 'ITEM123', name: 'Large', sku: 'KEEP-ME-5678', price_money: { amount: 700, currency: 'USD' } },
  })
  return single
}

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

test('updateSquareCatalogItem changes only the allow-listed fields, leaving sku/tax_ids/image_ids/reporting_category untouched', async () => {
  const responses = [
    { ok: true, body: singleVariationObject() },
    { ok: true, body: { catalog_object: { id: 'ITEM123', version: 112 } } },
  ]

  await withMockedFetch(responses, async calls => {
    await updateSquareCatalogItem('ITEM123', {
      name: 'New Name',
      variations: [{ id: 'VAR123', priceCents: 999, trackInventory: false }],
    }, FAKE_ENV)

    const upsertCall = calls[1]
    const sentObject = JSON.parse(upsertCall.options.body).object

    assert.equal(sentObject.item_data.name, 'New Name')
    assert.equal(sentObject.item_data.variations[0].item_variation_data.price_money.amount, 999)
    assert.equal(sentObject.item_data.variations[0].item_variation_data.track_inventory, false)

    // Untouched fields must survive byte-for-byte.
    assert.equal(sentObject.item_data.variations[0].item_variation_data.sku, 'KEEP-ME-1234')
    assert.deepEqual(sentObject.item_data.tax_ids, ['TAX1'])
    assert.deepEqual(sentObject.item_data.image_ids, ['IMG1'])
    assert.deepEqual(sentObject.item_data.reporting_category, { id: 'CAT_OLD', ordinal: 1 })
    assert.equal(sentObject.item_data.description, 'Old description')
    assert.deepEqual(sentObject.item_data.custom_attribute_values, { foo: { string_value: 'bar' } })
  })
})

test('updateSquareCatalogItem syncs reporting_category to match a categoryIds change', async () => {
  const responses = [
    { ok: true, body: singleVariationObject() },
    { ok: true, body: { catalog_object: { id: 'ITEM123', version: 112 } } },
  ]

  await withMockedFetch(responses, async calls => {
    await updateSquareCatalogItem('ITEM123', { categoryIds: ['CAT_NEW'] }, FAKE_ENV)

    const sentObject = JSON.parse(calls[1].options.body).object
    assert.deepEqual(sentObject.item_data.categories, [{ id: 'CAT_NEW' }])
    assert.deepEqual(sentObject.item_data.reporting_category, { id: 'CAT_NEW' })
  })
})

test('updateSquareCatalogItem clears reporting_category when categoryIds is emptied', async () => {
  const responses = [
    { ok: true, body: singleVariationObject() },
    { ok: true, body: { catalog_object: { id: 'ITEM123', version: 112 } } },
  ]

  await withMockedFetch(responses, async calls => {
    await updateSquareCatalogItem('ITEM123', { categoryIds: [] }, FAKE_ENV)

    const sentObject = JSON.parse(calls[1].options.body).object
    assert.deepEqual(sentObject.item_data.categories, [])
    assert.equal('reporting_category' in sentObject.item_data, false)
  })
})

test('updateSquareCatalogItem sends an idempotency_key and preserves the object version', async () => {
  const responses = [
    { ok: true, body: singleVariationObject() },
    { ok: true, body: { catalog_object: { id: 'ITEM123', version: 112 } } },
  ]

  await withMockedFetch(responses, async calls => {
    await updateSquareCatalogItem('ITEM123', { name: 'New Name' }, FAKE_ENV)
    const body = JSON.parse(calls[1].options.body)
    assert.ok(body.idempotency_key)
    assert.equal(body.object.version, 111)
    assert.equal(body.object.item_data.variations[0].version, 222)
  })
})

test('updateSquareCatalogItem edits only the referenced variation, leaving sibling variations untouched', async () => {
  const responses = [
    { ok: true, body: multiVariationObject() },
    { ok: true, body: { catalog_object: { id: 'ITEM123', version: 113 } } },
  ]

  await withMockedFetch(responses, async calls => {
    await updateSquareCatalogItem('ITEM123', {
      variations: [{ id: 'VAR123', priceCents: 999 }],
    }, FAKE_ENV)

    const sentObject = JSON.parse(calls[1].options.body).object
    const [varA, varB] = sentObject.item_data.variations

    assert.equal(varA.item_variation_data.price_money.amount, 999)
    // Untouched sibling variation must survive byte-for-byte.
    assert.equal(varB.id, 'VAR456')
    assert.equal(varB.item_variation_data.name, 'Large')
    assert.equal(varB.item_variation_data.sku, 'KEEP-ME-5678')
    assert.equal(varB.item_variation_data.price_money.amount, 700)
  })
})

test('deleteSquareCatalogVariation refuses to delete an item down to zero variations', async () => {
  const responses = [{ ok: true, body: singleVariationObject() }]

  await withMockedFetch(responses, async () => {
    await assert.rejects(
      () => deleteSquareCatalogVariation('ITEM123', 'VAR123', FAKE_ENV),
      /at least one variation/
    )
  })
})

test('deleteSquareCatalogVariation deletes a variation when siblings remain', async () => {
  const responses = [
    { ok: true, body: multiVariationObject() },
    { ok: true, body: { deleted_object_ids: ['VAR456'], deleted_at: '2026-01-01T00:00:00Z' } },
  ]

  await withMockedFetch(responses, async calls => {
    const result = await deleteSquareCatalogVariation('ITEM123', 'VAR456', FAKE_ENV)
    assert.deepEqual(result.deleted_object_ids, ['VAR456'])
    assert.match(calls[1].url, /\/v2\/catalog\/object\/VAR456$/)
    assert.equal(calls[1].options.method, 'DELETE')
  })
})

test('updateSquareCatalogItem surfaces a version conflict as SquareVersionMismatchError', async () => {
  const responses = [
    { ok: true, body: singleVariationObject() },
    {
      ok: false,
      status: 400,
      body: { errors: [{ category: 'INVALID_REQUEST_ERROR', code: 'VERSION_MISMATCH', detail: 'stale version' }] },
    },
  ]

  await withMockedFetch(responses, async () => {
    await assert.rejects(
      () => updateSquareCatalogItem('ITEM123', { name: 'New Name' }, FAKE_ENV),
      SquareVersionMismatchError
    )
  })
})
