import assert from 'node:assert/strict'
import { test } from 'node:test'
import ts from 'typescript'
import fs from 'node:fs'
// Transpile only the pure utility dependency graph; never import stores or start APIs.
function loadTS(file) {
  const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8')
  if (file.endsWith('.json')) return { default: JSON.parse(source) }
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText
  const module = { exports: {} }
  const require = path =>
    loadTS(
      new URL(path.endsWith('.json') ? path : `${path}.ts`, new URL(file, import.meta.url)).href
    )
  Function('require', 'module', 'exports', code)(require, module, module.exports)
  return module.exports
}
const { getFeaturedDay } = loadTS('../src/utils/eventOccurrences.ts')
const { getStoreTodayISO, hasEventStarted, eventDateToISO, eventStartISO } = loadTS(
  '../src/utils/eventDateTime.ts'
)
const now = new Date('2026-09-09T17:00:00Z')
const weekly = {
  id: 'weekly',
  jsDay: 3,
  eventName: 'Weekly',
  time: '6:00 PM',
  description: 'Weekly',
  gameType: 'Game',
  gameTypeId: 'game',
  dayName: 'Wednesday',
}
const special = {
  id: 'special',
  title: 'Special',
  date: '2026-09-09',
  time: '7:00 PM',
  entry: '0',
  description: 'Special',
}
const override = { id: 'override', weeklyEventId: 'weekly', date: '2026-09-09' }
test('normal weekly occurrence appears', () =>
  assert.equal(getFeaturedDay([], [weekly], [], now).events[0].title, 'Weekly'))
test('special events are additive', () =>
  assert.equal(getFeaturedDay([special], [weekly], [], now).events.length, 2))
test('override suppresses only its occurrence', () => {
  const result = getFeaturedDay([], [weekly], [override], now)
  assert.equal(result.date, 'Wednesday, September 16')
})
test('special remains when weekly occurrence is suppressed', () =>
  assert.deepEqual(
    getFeaturedDay([special], [weekly], [override], now).events.map(e => e.title),
    ['Special']
  ))
test('multiple weekly events in a day survive', () =>
  assert.equal(getFeaturedDay([], [weekly, { ...weekly, id: 'second' }], [], now).events.length, 2))
test('multiple special events in a day survive', () =>
  assert.equal(
    getFeaturedDay([special, { ...special, id: 'second' }], [], [], now).events.length,
    2
  ))
test('malformed dates never become today', () => {
  for (const date of ['nonsense', '2026-02-30', ''])
    assert.equal(getFeaturedDay([{ ...special, date }], [], [], now), null)
})
test('earlier today is started', () =>
  assert.equal(hasEventStarted('2026-09-09', '11:00 AM', now), true))
test('later today remains eligible', () =>
  assert.equal(hasEventStarted('2026-09-09', '6:00 PM', now), false))
test('store timezone controls today', () =>
  assert.equal(getStoreTodayISO(new Date('2026-09-10T02:00:00Z')), '2026-09-09'))
test('midnight boundary follows Central date', () => {
  assert.equal(getStoreTodayISO(new Date('2026-09-10T04:59:59Z')), '2026-09-09')
  assert.equal(getStoreTodayISO(new Date('2026-09-10T05:00:00Z')), '2026-09-10')
})
test('winter midnight and DST are deterministic', () => {
  assert.equal(getStoreTodayISO(new Date('2026-01-10T05:59:59Z')), '2026-01-09')
  assert.equal(getStoreTodayISO(new Date('2026-01-10T06:00:00Z')), '2026-01-10')
})
test('real ISO and historical month-name dates parse', () => {
  assert.equal(eventDateToISO('September 9, 2026'), '2026-09-09')
  assert.equal(eventDateToISO('2026-09-09'), '2026-09-09')
})

test('structured event times use Central offsets in summer and winter', () => {
  assert.equal(eventStartISO('2026-09-09', '6:00 PM'), '2026-09-09T23:00:00.000Z')
  assert.equal(eventStartISO('2026-01-09', '6:00 PM'), '2026-01-10T00:00:00.000Z')
})
