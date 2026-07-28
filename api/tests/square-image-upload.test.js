import test from 'node:test'
import assert from 'node:assert/strict'

import { uploadSquareCatalogImage } from '../squarePosClient.js'

const FAKE_ENV = { SQUARE_ACCESS_TOKEN: 'fake-token', SQUARE_ENV: 'production' }

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

// Square's CreateCatalogImage endpoint appends the new image to item_data's
// image_ids rather than replacing/prepending it — every read path in this
// codebase treats image_ids[0] as "the" image, so a newly uploaded image
// would never actually display without this reordering follow-up write.
test('uploadSquareCatalogImage moves the newly uploaded image to the front of image_ids', async () => {
  const responses = [
    // POST /v2/catalog/images
    { ok: true, body: { image: { id: 'NEW_IMAGE', image_data: { url: 'https://example.com/new.png' } } } },
    // GET /v2/catalog/object/:id (fetchRawCatalogObject)
    {
      ok: true,
      body: {
        object: {
          id: 'ITEM123',
          version: 111,
          item_data: { name: 'Test Item', image_ids: ['OLD_IMAGE'] },
        },
      },
    },
    // POST /v2/catalog/object (reorder write)
    { ok: true, body: { catalog_object: { id: 'ITEM123', version: 112 } } },
  ]

  await withMockedFetch(responses, async calls => {
    const result = await uploadSquareCatalogImage(
      'ITEM123',
      { buffer: Buffer.from('fake'), filename: 'test.png', mimeType: 'image/png' },
      FAKE_ENV
    )

    assert.equal(result.imageUrl, 'https://example.com/new.png')

    const reorderCall = calls[2]
    const sentObject = JSON.parse(reorderCall.options.body).object
    assert.deepEqual(sentObject.item_data.image_ids, ['NEW_IMAGE', 'OLD_IMAGE'])
    assert.equal(sentObject.version, 111)
  })
})

test('uploadSquareCatalogImage drops a stale duplicate of the new image id from the tail', async () => {
  const responses = [
    { ok: true, body: { image: { id: 'NEW_IMAGE', image_data: { url: 'https://example.com/new.png' } } } },
    {
      ok: true,
      body: {
        object: {
          id: 'ITEM123',
          version: 111,
          // Square deduped this upload to an image id that was already present.
          item_data: { name: 'Test Item', image_ids: ['OLD_IMAGE', 'NEW_IMAGE'] },
        },
      },
    },
    { ok: true, body: { catalog_object: { id: 'ITEM123', version: 112 } } },
  ]

  await withMockedFetch(responses, async calls => {
    await uploadSquareCatalogImage(
      'ITEM123',
      { buffer: Buffer.from('fake'), filename: 'test.png', mimeType: 'image/png' },
      FAKE_ENV
    )

    const sentObject = JSON.parse(calls[2].options.body).object
    assert.deepEqual(sentObject.item_data.image_ids, ['NEW_IMAGE', 'OLD_IMAGE'])
  })
})
