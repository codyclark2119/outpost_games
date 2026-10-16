#!/usr/bin/env node
// End-to-end check of online ordering against the Square SANDBOX: makes a
// checkout link for one Magic product the same way POST /api/checkout does,
// waits while you pay it in a browser with Square's sandbox test card, then
// confirms the product's stock count went down by the quantity bought.
// (A checkout link's order stays a DRAFT until a buyer pays on the hosted
// page, so it can't be paid from code with the Payments API.)
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

console.log('')
console.log('Open that link and pay with the sandbox test card 4111 1111 1111 1111')
console.log('(any future expiry, any CVV, any ZIP). Waiting up to 5 minutes for the payment…')

let after = before
for (let attempt = 0; attempt < 60 && after === before; attempt++) {
  await new Promise(resolve => setTimeout(resolve, 5000))
  after = await countOf(product.id)
}
const { order } = await client.request(`/v2/orders/${link.orderId}`)
console.log(`Order ${order.id}: ${order.state}`)
console.log(`On hand after: ${after}`)
if (after === before - 1) {
  console.log('PASS: a paid online order lowered the stock count by 1.')
} else {
  console.log(
    after === before
      ? 'FAIL: no stock change within 5 minutes (was the link paid?).'
      : `FAIL: expected ${before - 1}, got ${after}.`
  )
  process.exit(1)
}
