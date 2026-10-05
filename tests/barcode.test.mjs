import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadTS } from './loadTS.mjs'
const { barcodeVariants, findByBarcode } = loadTS('../src/utils/barcode.ts')

const items = [
  { id: 'A', sku: 'J268306', upc: '195166337265' },
  { id: 'B', sku: '2866723', upc: null },
  { id: 'C', sku: null, upc: null },
]

test('a scanned EAN-13 finds the product stored with its 12-digit UPC-A', () =>
  assert.deepEqual(
    findByBarcode(items, '0195166337265').map(i => i.id),
    ['A']
  ))
test('a shop SKU label matches case-insensitively', () =>
  assert.deepEqual(
    findByBarcode(items, ' j268306 ').map(i => i.id),
    ['A']
  ))
test('unknown and empty codes find nothing', () => {
  assert.deepEqual(findByBarcode(items, '999'), [])
  assert.deepEqual(findByBarcode(items, '   '), [])
})
test('variants are symmetric', () => {
  assert.deepEqual(barcodeVariants('195166337265'), ['195166337265', '0195166337265'])
  assert.deepEqual(barcodeVariants('0195166337265'), ['0195166337265', '195166337265'])
})
