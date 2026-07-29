import test from 'node:test'
import assert from 'node:assert/strict'

import {
  batchRetrieveSquareCatalogObjects,
  batchUpsertSquareCatalogObjects,
  batchDeleteSquareCatalogObjects,
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

test('batchRetrieveSquareCatalogObjects chunks at 1000 ids per call and merges results', async () => {
  const ids = Array.from({ length: 1500 }, (_, i) => `ID${i}`)
  const responses = [
    { ok: true, body: { objects: ids.slice(0, 1000).map(id => ({ id, type: 'ITEM' })) } },
    { ok: true, body: { objects: ids.slice(1000).map(id => ({ id, type: 'ITEM' })) } },
  ]

  await withMockedFetch(responses, async calls => {
    const { objectsById } = await batchRetrieveSquareCatalogObjects(ids, {}, FAKE_ENV)

    assert.equal(calls.length, 2)
    assert.equal(JSON.parse(calls[0].options.body).object_ids.length, 1000)
    assert.equal(JSON.parse(calls[1].options.body).object_ids.length, 500)
    assert.equal(objectsById.size, 1500)
    assert.equal(objectsById.get('ID0').id, 'ID0')
    assert.equal(objectsById.get('ID1499').id, 'ID1499')
  })
})

test('batchRetrieveSquareCatalogObjects only populates relatedObjectsById when requested', async () => {
  const responses = [
    {
      ok: true,
      body: {
        objects: [{ id: 'ITEM1', type: 'ITEM' }],
        related_objects: [{ id: 'CAT1', type: 'CATEGORY' }],
      },
    },
  ]

  await withMockedFetch(responses, async calls => {
    const { relatedObjectsById } = await batchRetrieveSquareCatalogObjects(
      ['ITEM1'],
      { includeRelatedObjects: true },
      FAKE_ENV
    )
    assert.equal(JSON.parse(calls[0].options.body).include_related_objects, true)
    assert.equal(relatedObjectsById.get('CAT1').type, 'CATEGORY')
  })
})

test('batchUpsertSquareCatalogObjects chunks at 1000 objects per call and merges id_mappings', async () => {
  const objects = Array.from({ length: 1200 }, (_, i) => ({ id: `#temp${i}`, type: 'ITEM' }))
  const responses = [
    {
      ok: true,
      body: {
        objects: objects.slice(0, 1000),
        id_mappings: [{ client_object_id: '#temp0', object_id: 'REAL0' }],
      },
    },
    {
      ok: true,
      body: {
        objects: objects.slice(1000),
        id_mappings: [{ client_object_id: '#temp1199', object_id: 'REAL1199' }],
      },
    },
  ]

  await withMockedFetch(responses, async calls => {
    const { objects: resultObjects, idMappings } = await batchUpsertSquareCatalogObjects(objects, FAKE_ENV)

    assert.equal(calls.length, 2)
    assert.equal(JSON.parse(calls[0].options.body).batches[0].objects.length, 1000)
    assert.equal(JSON.parse(calls[1].options.body).batches[0].objects.length, 200)
    assert.ok(JSON.parse(calls[0].options.body).idempotency_key)
    assert.equal(resultObjects.length, 1200)
    assert.equal(idMappings.get('#temp0'), 'REAL0')
    assert.equal(idMappings.get('#temp1199'), 'REAL1199')
  })
})

test('batchDeleteSquareCatalogObjects chunks at 200 ids per call and accumulates partial success', async () => {
  const ids = Array.from({ length: 250 }, (_, i) => `ID${i}`)
  const responses = [
    // First chunk: only 199 of the 200 sent actually got deleted (partial success).
    { ok: true, body: { deleted_object_ids: ids.slice(0, 199) } },
    { ok: true, body: { deleted_object_ids: ids.slice(200, 250) } },
  ]

  await withMockedFetch(responses, async calls => {
    const { deletedIds } = await batchDeleteSquareCatalogObjects(ids, FAKE_ENV)

    assert.equal(calls.length, 2)
    assert.equal(JSON.parse(calls[0].options.body).object_ids.length, 200)
    assert.equal(JSON.parse(calls[1].options.body).object_ids.length, 50)
    assert.equal(deletedIds.length, 199 + 50)
  })
})
