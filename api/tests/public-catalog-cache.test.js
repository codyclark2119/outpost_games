import test from 'node:test'
import assert from 'node:assert/strict'
import {
  initSquarePublicCatalogCache,
  getCachedPublicSquareCatalog,
} from '../services/publicCatalogCache.js'

test('the public catalog is read from Redis once, then served from memory', async () => {
  const stored = { fetchedAt: new Date().toISOString(), itemCount: 1, items: [{ id: 'a' }] }
  let gets = 0
  initSquarePublicCatalogCache({
    isRedisConnected: () => true,
    persistent: false,
    redisClient: {
      get: async () => {
        gets += 1
        return JSON.stringify(stored)
      },
      set: async () => {},
    },
  })

  const first = await getCachedPublicSquareCatalog()
  const second = await getCachedPublicSquareCatalog()

  assert.deepEqual(first.items, stored.items)
  assert.equal(second, first)
  assert.equal(gets, 1)
})
