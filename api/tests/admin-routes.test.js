import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mountRecords } from '../routes/records.js'
import { initAuth, createSession, requireAdminAuth } from '../auth.js'
import { errorHandler } from '../middleware/errorHandler.js'
import { validateSquareMutation } from '../schemas/square.js'

const event = {
  title: 'Tournament',
  date: '2026-09-09',
  time: '6:00 PM',
  entry: '0',
  description: 'Bring a deck',
}
const listing = { name: 'Card', setName: 'Set', price: 1, quantityInStock: 0 }
function harness(dependencies = {}) {
  const routes = new Map()
  const app = Object.fromEntries(
    ['get', 'post', 'put', 'delete'].map(method => [
      method,
      (path, ...handlers) => routes.set(`${method} ${path}`, handlers),
    ])
  )
  mountRecords(app, {
    redisClient: null,
    isRedisConnected: () => false,
    persistent: false,
    ...dependencies,
  })
  return async (method, path, body, cookie = 'admin', params = {}) => {
    const handlers = routes.get(`${method} ${path}`)
    return dispatch(handlers, {
      method: method.toUpperCase(),
      path,
      body,
      cookies: { sid: cookie },
      params,
      query: {},
    })
  }
}
function dispatch(handlers, req) {
  return new Promise(resolve => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code
        return this
      },
      json(body) {
        resolve({ status: this.statusCode, body })
        return this
      },
    }
    let i = 0
    const next = error => {
      if (error) return errorHandler(error, req, res, () => {})
      const handler = handlers[i++]
      if (!handler) return resolve({ status: 200 })
      handler(req, res, next)
    }
    next()
  })
}
// Auth uses only an injected in-memory fake. No .env, Redis socket or Square client.
initAuth({
  redisClient: { get: async () => JSON.stringify({ username: 'test' }), expire: async () => {} },
  isRedisConnected: () => true,
})
test('malformed creation, update and unknown event fields return 400', async () => {
  const request = harness()
  for (const body of [
    {},
    { ...event, time: '25:00 PM' },
    { ...event, extra: true },
    { ...event, gameTypeId: 42 },
  ])
    assert.equal((await request('post', '/api/events', body)).status, 400)
  assert.equal((await request('put', '/api/events/:id', { isVisible: 'false' })).status, 400)
})
test('event history survives CRUD and updates preserve identity', async () => {
  const request = harness()
  const created = await request('post', '/api/events', event)
  assert.equal(created.status, 201)
  const updated = await request('put', '/api/events/:id', { title: 'Updated' }, 'admin', {
    id: created.body.id,
  })
  assert.equal(updated.body.id, created.body.id)
  assert.equal((await request('get', '/api/events')).body.length, 1)
})
test('weekly overrides reject malformed and unknown fields and duplicate occurrences', async () => {
  const request = harness()
  for (const body of [
    { weeklyEventId: 'weekly', date: '2026-02-30' },
    { weeklyEventId: 'weekly', date: '2026-09-09', reason: 4 },
    { weeklyEventId: 'weekly', date: '2026-09-09', extra: true },
  ])
    assert.equal((await request('post', '/api/weekly-overrides', body)).status, 400)
  const body = { weeklyEventId: 'weekly', date: '2026-09-09' }
  assert.equal((await request('post', '/api/weekly-overrides', body)).status, 201)
  assert.equal((await request('post', '/api/weekly-overrides', body)).status, 409)
})
test('production persistence unavailable rejects every record mutation', async () => {
  const request = harness({ persistent: true })
  for (const [route, body] of [
    ['events', event],
    ['weekly-overrides', { weeklyEventId: 'weekly', date: '2026-09-09' }],
    ['tcgplayer-listings', listing],
  ]) {
    assert.equal((await request('post', `/api/${route}`, body)).status, 503)
    assert.equal(
      (await request('delete', `/api/${route}/:id`, undefined, 'admin', { id: 'existing' })).status,
      503
    )
  }
  assert.equal((await request('delete', '/api/tcgplayer-listings')).status, 503)
})
test('listing zero quantity and zero price survive, unknown updates are rejected', async () => {
  const request = harness()
  const created = await request('post', '/api/tcgplayer-listings', listing)
  assert.equal(created.body.quantityInStock, 0)
  const updated = await request('put', '/api/tcgplayer-listings/:id', { price: 0 }, 'admin', {
    id: created.body.id,
  })
  assert.equal(updated.body.priceDisplay, '$0.00')
  assert.equal((await request('put', '/api/tcgplayer-listings/:id', { id: 'changed' })).status, 400)
})
test('Redis write failure returns 503 and never claims a listing was created', async () => {
  const client = {
    watch: async () => {},
    get: async () => null,
    unwatch: async () => {},
    multi() {
      return {
        set() {
          return this
        },
        exec: async () => {
          throw new Error('unavailable')
        },
      }
    },
    executeIsolated: async fn => fn(client),
  }
  const request = harness({ persistent: true, redisClient: client, isRedisConnected: () => true })
  assert.equal((await request('post', '/api/tcgplayer-listings', listing)).status, 503)
})
test('missing session returns 401', async () => {
  const result = await dispatch([requireAdminAuth], { method: 'GET', path: '/admin', cookies: {} })
  assert.equal(result.status, 401)
})
test('new Square validation rejects malformed writes before any upstream call', async () => {
  const cases = [
    ['/products/id', { variations: {} }],
    ['/products/id', { hiddenFromWeb: 'false' }],
    ['/products/id', { variations: [{ id: 'v', priceCents: -1 }] }],
    ['/products/id', { releasedAt: '2026-02-30' }],
    ['/categories', { name: 4 }],
    ['/inventory/batch', { changes: [{ variationId: 'v', quantity: null }] }],
    ['/products/batch-visibility', { itemIds: ['id'], sellable: 'false' }],
    ['/products/id/variations', { name: 'New', priceCents: 1.5 }],
  ]
  for (const [path, body] of cases)
    assert.equal(
      (
        await dispatch([validateSquareMutation], {
          method: path === '/products/id' ? 'PUT' : 'POST',
          path,
          body,
        })
      ).status,
      400,
      path
    )
})
test('Square valid zero quantities, false booleans and null costs pass', async () => {
  assert.equal(
    (
      await dispatch([validateSquareMutation], {
        method: 'PUT',
        path: '/products/id',
        body: {
          hiddenFromWeb: false,
          variations: [{ id: 'v', priceCents: 0, costCents: null, sellable: false }],
        },
      })
    ).status,
    200
  )
})
// Keep the import checked without constructing a real session or touching dependencies.
assert.equal(typeof createSession, 'function')

test('event creation rejects normalized impossible dates', async () => {
  const request = harness()
  for (const date of ['2026-02-30', 'February 30, 2026'])
    assert.equal((await request('post', '/api/events', { ...event, date })).status, 400)
})

test('Redis concurrent-edit conflicts return 409', async () => {
  const client = {
    watch: async () => {},
    get: async () => null,
    unwatch: async () => {},
    multi() {
      return {
        set() {
          return this
        },
        exec: async () => {
          const error = new Error('conflict')
          error.name = 'WatchError'
          throw error
        },
      }
    },
    executeIsolated: async fn => fn(client),
  }
  const request = harness({ persistent: true, redisClient: client, isRedisConnected: () => true })
  assert.equal((await request('post', '/api/events', event)).status, 409)
})
