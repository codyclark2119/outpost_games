import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mountRecords } from '../routes/records.js'
import { errorHandler } from '../middleware/errorHandler.js'
import {
  buildEventIcs,
  buildEventShareHtml,
  eventDateISO,
  eventStart,
  entryLabel,
} from '../lib/eventShare.js'

const prerelease = {
  id: 'evt-1',
  title: 'Foundations Prerelease',
  date: 'October 25, 2026',
  time: '6:00 PM',
  entry: '30.00',
  description: 'Six packs, prizes for top 4; bring sleeves, please.',
  isVisible: true,
}

test('event dates parse from the stored readable form and ISO', () => {
  assert.equal(eventDateISO('October 25, 2026'), '2026-10-25')
  assert.equal(eventDateISO('Sunday, March 8, 2026'), '2026-03-08')
  assert.equal(eventDateISO('2026-09-09'), '2026-09-09')
  assert.equal(eventDateISO('Smarch 1, 2026'), null)
})

test('event start converts store time to UTC on both sides of the DST change', () => {
  // Central Daylight Time (UTC-5)
  assert.equal(eventStart(prerelease).toISOString(), '2026-10-25T23:00:00.000Z')
  // Central Standard Time (UTC-6), after the November switch
  assert.equal(
    eventStart({ date: 'December 5, 2026', time: '6:00 PM' }).toISOString(),
    '2026-12-06T00:00:00.000Z'
  )
  assert.equal(eventStart({ date: 'December 5, 2026', time: 'evening' }), null)
})

test('entry labels read naturally', () => {
  assert.equal(entryLabel('0.00'), 'Free entry')
  assert.equal(entryLabel('30.00'), '$30 entry')
  assert.equal(entryLabel('7.50'), '$7.50 entry')
})

test('calendar file has the event, escaped text, folded lines and CRLF endings', () => {
  const ics = buildEventIcs(prerelease, new Date('2026-10-16T00:00:00Z'))
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/)
  assert.match(ics, /\r\nDTSTART:20261025T230000Z\r\n/)
  assert.match(ics, /\r\nDTEND:20261026T030000Z\r\n/)
  assert.match(ics, /\r\nSUMMARY:Foundations Prerelease\r\n/)
  assert.match(ics, /top 4\\; bring sleeves\\, please\./)
  assert.match(ics, /\r\nUID:evt-1@outpostgamesrgv\.com\r\n/)
  for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75, line)
  assert.equal(buildEventIcs({ ...prerelease, time: 'TBD' }), null)
})

test('share page escapes event text and points at the event page', () => {
  const page = buildEventShareHtml({ ...prerelease, title: 'Draft <night> & "fun"' })
  assert.match(page, /og:title" content="Draft &lt;night&gt; &amp; &quot;fun&quot;"/)
  assert.match(page, /og:url" content="https:\/\/outpostgamesrgv\.com\/events\/evt-1"/)
  assert.match(page, /Sunday, October 25 at 6:00 PM · \$30 entry/)
  assert.doesNotMatch(page, /<night>/)
})

function harness(events) {
  const routes = new Map()
  const app = Object.fromEntries(
    ['get', 'post', 'put', 'delete'].map(m => [
      m,
      (path, ...handlers) => routes.set(`${m} ${path}`, handlers),
    ])
  )
  const memory = JSON.stringify(events)
  mountRecords(app, {
    redisClient: { get: async () => memory },
    isRedisConnected: () => true,
    persistent: false,
  })
  return (path, id) =>
    new Promise(resolve => {
      const headers = {}
      const res = {
        statusCode: 200,
        status(code) {
          this.statusCode = code
          return this
        },
        type(value) {
          headers['content-type'] = value
          return this
        },
        set(name, value) {
          headers[name.toLowerCase()] = value
          return this
        },
        send(body) {
          resolve({ status: this.statusCode, headers, body })
        },
        json(body) {
          resolve({ status: this.statusCode, headers, body })
        },
        redirect(status, location) {
          resolve({ status, headers: { location } })
        },
      }
      const req = { params: { id }, query: {}, cookies: {} }
      const [handler] = routes.get(`get ${path}`)
      handler(req, res, error => errorHandler(error, req, res, () => {}))
    })
}

test('calendar and share routes serve visible events only', async () => {
  const get = harness([prerelease, { ...prerelease, id: 'evt-2', isVisible: false }])

  const ics = await get('/api/events/:id/calendar.ics', 'evt-1')
  assert.equal(ics.status, 200)
  assert.match(ics.headers['content-type'], /^text\/calendar/)
  assert.match(ics.headers['content-disposition'], /filename="foundations-prerelease\.ics"/)

  assert.equal((await get('/api/events/:id/calendar.ics', 'evt-2')).status, 404)
  assert.equal((await get('/api/events/:id/calendar.ics', 'nope')).status, 404)

  const share = await get('/api/share/events/:id', 'evt-1')
  assert.equal(share.status, 200)
  assert.match(share.body, /Foundations Prerelease/)

  const hidden = await get('/api/share/events/:id', 'evt-2')
  assert.deepEqual(hidden, { status: 302, headers: { location: '/events' } })
})
