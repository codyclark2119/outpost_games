import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createValue } from '../services/persistence.js'

const down = persistent => ({ redisClient: null, isRedisConnected: () => false, persistent })
const failing = persistent => ({
  redisClient: {
    get: async () => {
      throw new Error('boom')
    },
    set: async () => {
      throw new Error('boom')
    },
  },
  isRedisConnected: () => true,
  persistent,
})

test('a value falls back to memory without Redis outside production', async () => {
  const value = createValue(down(false), 'k')
  assert.equal(await value.get(), null)
  await value.set('2026-10')
  assert.equal(await value.get(), '2026-10')
})

test('a required value is a 503 without Redis in production', async () => {
  const value = createValue(down(true), 'k')
  await assert.rejects(value.get(), { status: 503 })
  await assert.rejects(value.set('x'), { status: 503 })
})

test('a cache value never fails, even when Redis errors in production', async () => {
  const value = createValue(failing(true), 'k', { required: false })
  await value.set('cached')
  assert.equal(await value.get(), 'cached')
})

test('a required value reports a Redis error as a 503', async () => {
  const value = createValue(failing(true), 'k')
  await assert.rejects(value.get(), { status: 503 })
})
