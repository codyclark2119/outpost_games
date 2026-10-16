#!/usr/bin/env node
// End-to-end check of online ordering against the Square SANDBOX: makes a
// checkout link for one Magic product the same way POST /api/checkout does,
// pays the link's order with Square's sandbox test card, then confirms the
// product's stock count went down by the quantity bought.
//
// Usage (from api/, with the SQUARE_SANDBOX_* variables in the repo-root .env):
//   SQUARE_ENV=sandbox node scripts/sandbox-checkout-test.js
//   SQUARE_ENV=sandbox node scripts/sandbox-checkout-test.js <variationId>
//
// Without a variation id it picks the first tracked, priced Magic product
// that has at least one unit sellable online. If none does, it raises the
// first tracked, priced Magic product's sandbox count to its reserve + 2 so
// there is something to buy. Refuses to run unless SQUARE_ENV=sandbox, since
// it takes a real payment otherwise.

import crypto from 'node:crypto'
import {
  loadSquareEnvironment,
  resolveSquareCredentials,
  createSquarePosClient,
  getSquareInventoryReport,
  listSquareInventory,
  adjustSquareInventoryCount,
  createSquarePaymentLink,
} from '../squarePosClient.js'
import { isMagicCategory, onlineQuantity, shopReserve } from '../onlineSales.js'

loadSquareEnvironment()
if (process.env.SQUARE_ENV !== 'sandbox') {
  console.error('Refusing to run: set SQUARE_ENV=sandbox. This script pays for an order.')
  process.exit(1)
}

const credentials = resolveSquareCredentials(process.env)
const client = createSquarePosClient(credentials)
const countOf = async variationId => {
  const [count] = await listSquareInventory(process.env, {
    catalogObjectIds: [variationId],
    locationIds: [credentials.locationId],
  })
  return Number(count?.quantity ?? 0)
}

const report = await getSquareInventoryReport(process.env)
const wanted = process.argv[2]
const candidates = report.items.filter(
  item =>
    isMagicCategory(item.categoryName) &&
    item.trackInventory &&
    item.sellable &&
    item.priceCents > 0 &&
    !/\bsingles\b/i.test(item.displayName)
)
let product = wanted
  ? report.items.find(item => item.id === wanted)
  : candidates.find(item => onlineQuantity(item.quantity, item.displayName) > 0)
if (!product && !wanted && candidates.length) {
  product = candidates[0]
  const quantity = shopReserve(product.displayName) + 2
  console.log(`No Magic product had stock to sell online; setting the sandbox count of`)
  console.log(`${product.displayName} to ${quantity} (was ${product.quantity ?? 0}).`)
  await adjustSquareInventoryCount(product.id, { quantity }, process.env)
}
if (!product) {
  console.error(
    wanted
      ? `No variation ${wanted} in the sandbox catalog.`
      : 'The sandbox has no tracked, priced Magic product to test with.'
  )
  process.exit(1)
}

const before = await countOf(product.id)
console.log(`Product: ${product.displayName} (${product.id})`)
console.log(`On hand: ${before}, sellable online: ${onlineQuantity(before, product.displayName)}`)

const link = await createSquarePaymentLink(
  { variationId: product.id, quantity: 1, note: 'Sandbox checkout test' },
  process.env
)
console.log(`Checkout link: ${link.url}`)

const { order } = await client.request(`/v2/orders/${link.orderId}`)
console.log(`Order ${order.id}: ${order.total_money.amount} ${order.total_money.currency}`)

const { payment } = await client.request('/v2/payments', {
  method: 'POST',
  body: {
    idempotency_key: crypto.randomUUID(),
    source_id: 'cnon:card-nonce-ok', // Square's sandbox "approved card" nonce
    amount_money: order.total_money,
    order_id: order.id,
    location_id: credentials.locationId,
  },
})
console.log(`Payment ${payment.id}: ${payment.status}`)

// Square applies the stock change asynchronously after payment.
let after = before
for (let attempt = 0; attempt < 10 && after === before; attempt++) {
  await new Promise(resolve => setTimeout(resolve, 2000))
  after = await countOf(product.id)
}
console.log(`On hand after: ${after}`)
if (after === before - 1) {
  console.log('PASS: a paid online order lowered the stock count by 1.')
} else {
  console.log(`FAIL: expected ${before - 1}, got ${after}.`)
  process.exit(1)
}
