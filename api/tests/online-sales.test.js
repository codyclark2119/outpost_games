import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mountOnlineSales } from '../routes/onlineSales.js'
import { errorHandler } from '../middleware/errorHandler.js'
import { isMagicCategory, isPackSized, onlineQuantity, shopReserve } from '../lib/onlineSales.js'

process.env.SQUARE_ENV = 'sandbox'
process.env.SQUARE_SANDBOX_ACCESS_TOKEN = 'fake-token'
process.env.SQUARE_SANDBOX_LOCATION_ID = 'LOC1'

test('only Magic is sold online', () => {
  assert.equal(isMagicCategory('Magic'), true)
  assert.equal(isMagicCategory(' magic: the gathering '), true)
  assert.equal(isMagicCategory('Pokemon'), false)
  assert.equal(isMagicCategory(null), false)
})

test('the shop keeps 5 of each booster pack and 1 of everything bigger', () => {
  assert.equal(isPackSized('Foundations Play Booster Pack'), true)
  assert.equal(isPackSized('Duskmourn - Collector Booster Packs'), true)
  assert.equal(isPackSized('Foundations Play Booster Box'), false)
  assert.equal(isPackSized('Bloomburrow Prerelease Pack'), false)
  assert.equal(isPackSized('Aetherdrift Bundle'), false)
  assert.equal(shopReserve('Foundations Play Booster Pack'), 5)
  assert.equal(shopReserve('Foundations Commander Deck'), 1)

  assert.equal(onlineQuantity(36, 'Play Booster Pack'), 31)
  assert.equal(onlineQuantity(5, 'Play Booster Pack'), 0)
  assert.equal(onlineQuantity(3, 'Play Booster Box'), 2)
  assert.equal(onlineQuantity(1, 'Play Booster Box'), 0)
  assert.equal(onlineQuantity(-4, 'Play Booster Box'), 0)
  assert.equal(onlineQuantity(null, 'Play Booster Box'), 0)
})

// A small Square account: Magic > Foundations holds a box and a pack item,
// Pokemon holds one more.
const categories = [
  { id: 'MAGIC', type: 'CATEGORY', category_data: { name: 'Magic' } },
  {
    id: 'FDN',
    type: 'CATEGORY',
    category_data: { name: 'Foundations', parent_category: { id: 'MAGIC' } },
  },
  { id: 'POKE', type: 'CATEGORY', category_data: { name: 'Pokemon' } },
]
const item = (id, name, categoryId, priceCents = 500) => ({
  id,
  type: 'ITEM',
  item_data: {
    name,
    categories: [{ id: categoryId }],
    variations: [
      {
        id: `${id}-V`,
        item_variation_data: {
          name: 'Regular',
          price_money: { amount: priceCents, currency: 'USD' },
          track_inventory: true,
          sellable: true,
        },
      },
    ],
  },
})
const items = {
  BOX: item('BOX', 'Foundations Play Booster Box', 'FDN', 16000),
  PACK: item('PACK', 'Foundations Play Booster Pack', 'FDN', 500),
  POKE: item('POKE', 'Surging Sparks Booster Pack', 'POKE', 500),
}
const onHand = { 'BOX-V': 2, 'PACK-V': 6, 'POKE-V': 40 }

const mockSquare = () => {
  const calls = []
  globalThis.fetch = async (url, options = {}) => {
    const { pathname, searchParams } = new URL(url)
    const body = options.body ? JSON.parse(options.body) : null
    calls.push({ pathname, body })
    let payload
    if (pathname === '/v2/catalog/list' && searchParams.get('types') === 'CATEGORY')
      payload = { objects: categories }
    else if (pathname.startsWith('/v2/catalog/object/'))
      payload = { object: items[pathname.split('/').pop()] }
    else if (pathname === '/v2/inventory/counts/batch-retrieve')
      payload = {
        counts: body.catalog_object_ids.map(id => ({
          catalog_object_id: id,
          quantity: String(onHand[id] ?? 0),
          state: 'IN_STOCK',
        })),
      }
    else if (pathname === '/v2/online-checkout/payment-links')
      payload = { payment_link: { url: 'https://square.link/u/abc123', order_id: 'ORDER1' } }
    else throw new Error(`Unexpected Square call: ${pathname}`)
    return { ok: true, status: 200, json: async () => payload }
  }
  return calls
}

function harness(enabledRows) {
  const routes = new Map()
  const app = Object.fromEntries(
    ['get', 'post', 'put', 'delete'].map(m => [
      m,
      (path, ...handlers) => routes.set(`${m} ${path}`, handlers),
    ])
  )
  mountOnlineSales(app, {
    redisClient: { get: async () => JSON.stringify(enabledRows) },
    isRedisConnected: () => true,
    persistent: false,
  })
  return (method, path, { params = {}, body } = {}) =>
    new Promise(resolve => {
      const res = {
        statusCode: 200,
        status(code) {
          this.statusCode = code
          return this
        },
        json(payload) {
          resolve({ status: this.statusCode, body: payload })
        },
      }
      const req = { method, path, params, body, query: {}, cookies: {}, headers: {} }
      const handler = routes.get(`${method} ${path}`).at(-1)
      handler(req, res, error => errorHandler(error, req, res, () => {}))
    })
}

test('checkout makes a Square link for a switched-on Magic product within what can be sold', async t => {
  const original = globalThis.fetch
  t.after(() => (globalThis.fetch = original))
  const calls = mockSquare()
  const call = harness([{ itemId: 'BOX' }, { itemId: 'PACK' }, { itemId: 'POKE' }])

  const ok = await call('post', '/api/checkout', {
    body: { itemId: 'BOX', variationId: 'BOX-V', quantity: 1 },
  })
  assert.deepEqual(ok, { status: 200, body: { ok: true, url: 'https://square.link/u/abc123' } })
  const link = calls.find(c => c.pathname === '/v2/online-checkout/payment-links').body
  assert.deepEqual(link.order.line_items, [{ catalog_object_id: 'BOX-V', quantity: '1' }])
  assert.equal(link.order.location_id, 'LOC1')
  assert.equal(link.checkout_options.redirect_url, 'https://outpostgamesrgv.com/order/thanks')

  // 2 boxes on the shelf, 1 stays at the shop.
  const tooMany = await call('post', '/api/checkout', {
    body: { itemId: 'BOX', variationId: 'BOX-V', quantity: 2 },
  })
  assert.equal(tooMany.status, 409)
  assert.equal(tooMany.body.available, 1)

  // 6 packs on the shelf, 5 stay at the shop.
  const packs = await call('post', '/api/checkout', {
    body: { itemId: 'PACK', variationId: 'PACK-V', quantity: 2 },
  })
  assert.equal(packs.status, 409)
  assert.equal(packs.body.available, 1)

  // Switched on, but not Magic.
  const pokemon = await call('post', '/api/checkout', {
    body: { itemId: 'POKE', variationId: 'POKE-V', quantity: 1 },
  })
  assert.equal(pokemon.status, 404)
})

test('checkout refuses products nobody switched on, and bad requests', async t => {
  const original = globalThis.fetch
  t.after(() => (globalThis.fetch = original))
  const calls = mockSquare()
  const call = harness([])

  const off = await call('post', '/api/checkout', {
    body: { itemId: 'BOX', variationId: 'BOX-V', quantity: 1 },
  })
  assert.equal(off.status, 404)
  assert.equal(calls.length, 0, 'never reaches Square for a switched-off product')

  const zero = await call('post', '/api/checkout', {
    body: { itemId: 'BOX', variationId: 'BOX-V', quantity: 0 },
  })
  assert.equal(zero.status, 400)
})
