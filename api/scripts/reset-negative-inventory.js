#!/usr/bin/env node
// Finds every Square catalog variation with a negative on-hand count and
// resets it to 0. Negative counts drift in over time from POS corrections,
// returns, or miscounts, and aren't meaningful as "out of stock" beyond
// zero — this is a one-time cleanup ahead of the shop's physical re-inventory,
// not something that should run unattended on a schedule.
//
// Respects whatever SQUARE_ENV currently resolves to, same as every other
// script here — pointed at production, this writes to the real POS
// inventory, so always dry-run first.
//
// Usage:
//   node scripts/reset-negative-inventory.js            # preview only, no changes
//   node scripts/reset-negative-inventory.js --apply     # actually reset to 0

import { getSquareInventoryReport, adjustSquareInventoryCount, resolveSquareCredentials, loadSquareEnvironment } from '../squarePosClient.js'

loadSquareEnvironment()

const APPLY = process.argv.includes('--apply')

async function main() {
  const { environment, locationId } = resolveSquareCredentials(process.env)
  console.log(`Reading inventory report (${environment})...`)

  const report = await getSquareInventoryReport(process.env)
  const negativeItems = report.items.filter(item => item.trackInventory && item.quantity != null && item.quantity < 0)

  console.log(`\n${negativeItems.length} item(s) with a negative on-hand count:`)
  for (const item of negativeItems) {
    console.log(`   ${item.displayName} (sku ${item.sku || 'none'}) — quantity ${item.quantity}`)
  }

  if (!APPLY) {
    console.log('\nPreview only — rerun with --apply to reset these to 0.')
    return
  }

  if (negativeItems.length === 0) {
    console.log('\nNothing to reset.')
    return
  }

  console.log(`\nResetting ${negativeItems.length} item(s) to 0...`)
  for (const item of negativeItems) {
    await adjustSquareInventoryCount(item.id, { quantity: 0, locationId }, process.env)
    console.log(`   reset "${item.displayName}" → 0`)
  }

  console.log(`\nDone — ${negativeItems.length} item(s) reset to 0.`)
}

main().catch(error => {
  console.error('Reset failed:', error.message)
  process.exit(1)
})
