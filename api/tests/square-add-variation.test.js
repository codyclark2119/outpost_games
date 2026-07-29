import test from 'node:test'
import assert from 'node:assert/strict'

import { addSquareCatalogVariation } from '../squarePosClient.js'

const FAKE_ENV = { SQUARE_ACCESS_TOKEN: 'fake-token', SQUARE_ENV: 'sandbox' }

// Matches this shop's real accounts: items are scoped to one specific
// location, NOT present_at_all_locations — confirmed live that a new
// ITEM_VARIATION defaults to present_at_all_locations: true, which Square
// rejects outright when the parent ITEM isn't also at all locations.
const singleVariationObject = () => ({
  object: {
    type: 'ITEM',
    id: 'ITEM123',
    version: 111,
    present_at_all_locations: false,
    present_at_location_ids: ['LOC1'],
    item_data: {
      name: 'Blight Curse',
      variations: [
        {
          type: 'ITEM_VARIATION',
          id: 'VAR123',
          version: 222,
          item_variation_data: {
            item_id: 'ITEM123',
            name: 'Regular',
            sku: 'KEEP-ME-1234',
            price_money: { amount: 4500, currency: 'USD' },
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

test('addSquareCatalogVariation appends a new variation, leaving the sibling untouched', async () => {
  const responses = [
    { ok: true, body: singleVariationObject() },
    { ok: true, body: { catalog_object: { id: 'ITEM123', version: 112 } } },
  ]

  await withMockedFetch(responses, async calls => {
    await addSquareCatalogVariation(
      'ITEM123',
      { name: 'Foil Enhanced', sku: 'NEW-SKU-9999', priceCents: 6000, trackInventory: true, sellable: true },
      FAKE_ENV
    )

    const sentObject = JSON.parse(calls[1].options.body).object
    assert.equal(sentObject.item_data.variations.length, 2)

    const [existing, added] = sentObject.item_data.variations
    assert.equal(existing.id, 'VAR123')
    assert.equal(existing.item_variation_data.sku, 'KEEP-ME-1234') // untouched

    assert.equal(added.id, '#new-variation')
    assert.equal(added.item_variation_data.name, 'Foil Enhanced')
    assert.equal(added.item_variation_data.sku, 'NEW-SKU-9999') // initial SKU IS allowed on create
    assert.equal(added.item_variation_data.price_money.amount, 6000)
    assert.equal(added.item_variation_data.pricing_type, 'FIXED_PRICING')
    assert.equal(added.item_variation_data.track_inventory, true)

    // The real bug this session hit live: a new variation left to Square's
    // own default (present at all locations) is rejected outright when the
    // parent item is scoped to specific locations only.
    assert.equal(added.present_at_all_locations, false)
    assert.deepEqual(added.present_at_location_ids, ['LOC1'])
  })
})

test('addSquareCatalogVariation matches an item that IS present at all locations', async () => {
  const itemAtAllLocations = singleVariationObject()
  itemAtAllLocations.object.present_at_all_locations = true
  delete itemAtAllLocations.object.present_at_location_ids

  const responses = [
    { ok: true, body: itemAtAllLocations },
    { ok: true, body: { catalog_object: { id: 'ITEM123', version: 112 } } },
  ]

  await withMockedFetch(responses, async calls => {
    await addSquareCatalogVariation('ITEM123', { name: 'Foil Enhanced' }, FAKE_ENV)

    const sentObject = JSON.parse(calls[1].options.body).object
    const added = sentObject.item_data.variations[1]
    assert.equal(added.present_at_all_locations, true)
    assert.equal(added.present_at_location_ids, undefined)
  })
})

test('addSquareCatalogVariation uses VARIABLE_PRICING when no priceCents given', async () => {
  const responses = [
    { ok: true, body: singleVariationObject() },
    { ok: true, body: { catalog_object: { id: 'ITEM123', version: 112 } } },
  ]

  await withMockedFetch(responses, async calls => {
    await addSquareCatalogVariation('ITEM123', { name: 'Draft Variation' }, FAKE_ENV)

    const sentObject = JSON.parse(calls[1].options.body).object
    const added = sentObject.item_data.variations[1]
    assert.equal(added.item_variation_data.pricing_type, 'VARIABLE_PRICING')
    assert.equal(added.item_variation_data.price_money, undefined)
    assert.equal(added.item_variation_data.sellable, true) // default
    assert.equal(added.item_variation_data.track_inventory, false) // default
  })
})
