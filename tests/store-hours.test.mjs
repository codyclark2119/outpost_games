import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadTS } from './loadTS.mjs'
const { getStoreStatus } = loadTS('../src/utils/storeHours.ts')
const { HOURS_BY_DAY, STORE_INFO, formatClock } = loadTS('../src/config/storeInfo.ts')

// Hours come from api/storeConfig.json: Tue–Sat 17:30–22:00 Central, Sun/Mon closed.
// 2026-10-06 is a Tuesday; Central is UTC-5 in October.
const at = iso => getStoreStatus(new Date(iso))

test('open during hours, with closing time', () =>
  assert.deepEqual(at('2026-10-06T23:00:00Z'), { isOpen: true, detail: 'Until 10 PM' }))
test('before opening on an open day', () =>
  assert.deepEqual(at('2026-10-06T15:00:00Z'), {
    isOpen: false,
    detail: 'Opens today at 5:30 PM',
  }))
test('closing time itself counts as closed', () =>
  assert.deepEqual(at('2026-10-07T03:00:00Z'), {
    isOpen: false,
    detail: 'Opens tomorrow at 5:30 PM',
  }))
test('closed days point at the next open day', () =>
  assert.deepEqual(at('2026-10-04T18:00:00Z'), { isOpen: false, detail: 'Opens Tue at 5:30 PM' }))
test('Monday reads as opening tomorrow', () =>
  assert.deepEqual(at('2026-10-05T18:00:00Z'), {
    isOpen: false,
    detail: 'Opens tomorrow at 5:30 PM',
  }))
test('hours display derives from the shared config', () => {
  assert.equal(formatClock('17:30'), '5:30 PM')
  assert.equal(formatClock('22:00'), '10 PM')
  assert.deepEqual(STORE_INFO.hours, { 'Sun–Mon': 'Closed', 'Tue–Sat': '5:30 PM – 10 PM' })
  assert.equal(HOURS_BY_DAY.length, 7)
  assert.equal(HOURS_BY_DAY[2].isOpen, true)
})
