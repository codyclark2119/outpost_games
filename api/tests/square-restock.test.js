import test from 'node:test'
import assert from 'node:assert/strict'

import { applyBoxToPackRestock } from '../squarePosClient.js'

const FAKE_ENV = {
  SQUARE_ACCESS_TOKEN: 'fake-token',
  SQUARE_ENV: 'production',
  SQUARE_LOCATION_ID: 'LOC1',
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

test('applyBoxToPackRestock computes correct new absolute quantities and writes both in one batched call', async () => {
  const responses = [
    // GET current counts (listSquareInventory)
    {
      ok: true,
      body: {
        counts: [
          { catalog_object_id: 'BOX1', quantity: '5' },
          { catalog_object_id: 'PACKS1', quantity: '4' },
        ],
      },
    },
    // POST /v2/inventory/batch-change (adjustSquareInventoryCountBatch)
    { ok: true, body: { counts: [] } },
  ]

  await withMockedFetch(responses, async calls => {
    const result = await applyBoxToPackRestock(
      { boxVariationId: 'BOX1', packsVariationId: 'PACKS1', packsPerBox: 12, boxesOpened: 2 },
      FAKE_ENV
    )

    assert.deepEqual(result, {
      previousBoxQty: 5,
      newBoxQty: 3, // 5 - 2
      previousPacksQty: 4,
      newPacksQty: 28, // 4 + 2*12
    })

    // Both writes land in ONE batch-change call, not two separate requests.
    assert.equal(calls.length, 2)
    const writeBody = JSON.parse(calls[1].options.body)
    assert.equal(writeBody.changes.length, 2)
    const [boxChange, packsChange] = writeBody.changes
    assert.equal(boxChange.physical_count.catalog_object_id, 'BOX1')
    assert.equal(boxChange.physical_count.quantity, '3')
    assert.equal(packsChange.physical_count.catalog_object_id, 'PACKS1')
    assert.equal(packsChange.physical_count.quantity, '28')
    // Both changes share one occurred_at timestamp within the single call.
    assert.equal(boxChange.physical_count.occurred_at, packsChange.physical_count.occurred_at)
  })
})

test('applyBoxToPackRestock refuses when boxesOpened exceeds current box stock', async () => {
  const responses = [
    {
      ok: true,
      body: {
        counts: [
          { catalog_object_id: 'BOX1', quantity: '1' },
          { catalog_object_id: 'PACKS1', quantity: '0' },
        ],
      },
    },
  ]

  await withMockedFetch(responses, async calls => {
    await assert.rejects(
      () =>
        applyBoxToPackRestock(
          { boxVariationId: 'BOX1', packsVariationId: 'PACKS1', packsPerBox: 12, boxesOpened: 2 },
          FAKE_ENV
        ),
      /only 1 in stock/
    )
    // Never reaches the write call.
    assert.equal(calls.length, 1)
  })
})

test('applyBoxToPackRestock refuses when boxesOpened is zero or negative', async () => {
  await assert.rejects(
    () =>
      applyBoxToPackRestock(
        { boxVariationId: 'BOX1', packsVariationId: 'PACKS1', packsPerBox: 12, boxesOpened: 0 },
        FAKE_ENV
      ),
    /positive integer/
  )
  await assert.rejects(
    () =>
      applyBoxToPackRestock(
        { boxVariationId: 'BOX1', packsVariationId: 'PACKS1', packsPerBox: 12, boxesOpened: -1 },
        FAKE_ENV
      ),
    /positive integer/
  )
})

test('applyBoxToPackRestock treats a missing count (never sold/tracked yet) as zero', async () => {
  const responses = [
    { ok: true, body: { counts: [{ catalog_object_id: 'BOX1', quantity: '3' }] } }, // PACKS1 has no count entry at all
    { ok: true, body: { counts: [] } },
  ]

  await withMockedFetch(responses, async () => {
    const result = await applyBoxToPackRestock(
      { boxVariationId: 'BOX1', packsVariationId: 'PACKS1', packsPerBox: 12, boxesOpened: 1 },
      FAKE_ENV
    )
    assert.equal(result.previousPacksQty, 0)
    assert.equal(result.newPacksQty, 12)
  })
})
