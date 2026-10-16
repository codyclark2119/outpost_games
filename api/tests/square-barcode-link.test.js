import test from 'node:test'
import assert from 'node:assert/strict'

import { linkSquareVariationBarcode, barcodeVariants } from '../squarePosClient.js'

const FAKE_ENV = { SQUARE_SANDBOX_ACCESS_TOKEN: 'fake-token', SQUARE_ENV: 'sandbox' }

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

const variationObject = (id, itemId, { name = 'Regular', sku, upc } = {}) => ({
  id,
  type: 'ITEM_VARIATION',
  version: 7,
  item_variation_data: {
    item_id: itemId,
    name,
    ...(sku ? { sku } : {}),
    ...(upc ? { upc } : {}),
    price_money: { amount: 4000, currency: 'USD' },
  },
})

const catalogPage = items => ({
  ok: true,
  body: {
    objects: items.map(({ id, name, variations }) => ({
      id,
      type: 'ITEM',
      item_data: { name, variations },
    })),
  },
})

const writtenVariation = calls => JSON.parse(calls.at(-1).options.body).object.item_variation_data

test('barcodeVariants treats UPC-A and its EAN-13 spelling as the same code', () => {
  assert.deepEqual(barcodeVariants(' 195166337173 '), ['195166337173', '0195166337173'])
  assert.deepEqual(barcodeVariants('0195166337173'), ['0195166337173', '195166337173'])
  assert.deepEqual(barcodeVariants('j268306'), ['J268306'])
})

test('linkSquareVariationBarcode fills an empty SKU', async () => {
  const variation = variationObject('VAR1', 'ITEM1')
  const responses = [
    catalogPage([{ id: 'ITEM1', name: 'Booster Box', variations: [variation] }]),
    { ok: true, body: { object: variation } },
    { ok: true, body: { catalog_object: variation } },
  ]
  await withMockedFetch(responses, async calls => {
    const result = await linkSquareVariationBarcode('VAR1', '195166337173', FAKE_ENV)
    assert.deepEqual(result, { field: 'sku', barcode: '195166337173' })
    assert.equal(writtenVariation(calls).sku, '195166337173')
  })
})

test('linkSquareVariationBarcode keeps an existing SKU and adds a manufacturer barcode as the GTIN', async () => {
  const variation = variationObject('VAR1', 'ITEM1', { sku: 'J268306' })
  const responses = [
    catalogPage([{ id: 'ITEM1', name: 'Commander Deck', variations: [variation] }]),
    { ok: true, body: { object: variation } },
    { ok: true, body: { catalog_object: variation } },
  ]
  await withMockedFetch(responses, async calls => {
    const result = await linkSquareVariationBarcode('VAR1', '195166337265', FAKE_ENV)
    assert.deepEqual(result, { field: 'upc', barcode: '195166337265' })
    assert.equal(writtenVariation(calls).sku, 'J268306')
    assert.equal(writtenVariation(calls).upc, '195166337265')
  })
})

test('linkSquareVariationBarcode never overwrites a SKU with a non-GTIN code', async () => {
  const variation = variationObject('VAR1', 'ITEM1', { sku: 'J268306' })
  await withMockedFetch(
    [catalogPage([{ id: 'ITEM1', name: 'Commander Deck', variations: [variation] }])],
    async calls => {
      await assert.rejects(
        () => linkSquareVariationBarcode('VAR1', 'ABC-123', FAKE_ENV),
        /SKUs are locked/
      )
      assert.equal(calls.length, 1) // never reached the write
    }
  )
})

test('linkSquareVariationBarcode refuses a barcode another product already uses, in either spelling', async () => {
  const target = variationObject('VAR1', 'ITEM1')
  const owner = variationObject('VAR2', 'ITEM2', { sku: 'S1', upc: '195166337173' })
  await withMockedFetch(
    [
      catalogPage([
        { id: 'ITEM1', name: 'Bundle', variations: [target] },
        { id: 'ITEM2', name: 'Reality Fracture Bundle', variations: [owner] },
      ]),
    ],
    async calls => {
      await assert.rejects(
        () => linkSquareVariationBarcode('VAR1', '0195166337173', FAKE_ENV),
        /already belongs to "Reality Fracture Bundle"/
      )
      assert.equal(calls.length, 1)
    }
  )
})
