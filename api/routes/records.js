import crypto from 'node:crypto'
import { requireAdminAuth } from '../auth.js'
import { asyncRoute, AppError } from '../middleware/errorHandler.js'
import { createCollection } from '../services/persistence.js'
import { validateEvent } from '../schemas/events.js'
import { object, string, invalid, validIsoDate } from '../schemas/validation.js'
import { buildEventIcs, buildEventShareHtml, eventDateISO } from '../eventShare.js'
export function validateOverride(body) {
  object(body, ['weeklyEventId', 'date', 'reason'], ['weeklyEventId', 'date'])
  string(body.weeklyEventId, 'weeklyEventId')
  if (!validIsoDate(body.date)) invalid('date must be a real YYYY-MM-DD date')
  if ('reason' in body) string(body.reason, 'reason', true)
  return body
}
export function mountRecords(app, store) {
  for (const [route, key, schema] of [
    [
      'events',
      'outpost:events',
      (body, partial) => {
        const parsed = validateEvent(body, partial)
        if (parsed.error) invalid(parsed.error)
        return parsed.value
      },
    ],
    ['weekly-overrides', 'outpost:weeklyOverrides', validateOverride],
  ]) {
    const collection = createCollection(store, key)
    // Mounted before /:id so the extra path segment is never read as an id;
    // shares this collection so the dev memory fallback sees the same events.
    if (route === 'events') mountEventShare(app, collection)
    app.get(
      `/api/${route}`,
      asyncRoute(async (_req, res) => res.json(await collection.read()))
    )
    app.post(
      `/api/${route}`,
      requireAdminAuth,
      asyncRoute(async (req, res) => {
        const value = schema(req.body, false)
        const record = { id: crypto.randomUUID(), ...value }
        await collection.update(rows => {
          if (
            route === 'weekly-overrides' &&
            rows.some(r => r.weeklyEventId === record.weeklyEventId && r.date === record.date)
          )
            throw new AppError(409, 'This occurrence is already suppressed')
          rows.push(record)
        })
        res.status(201).json(record)
      })
    )
    if (route !== 'weekly-overrides')
      app.put(
        `/api/${route}/:id`,
        requireAdminAuth,
        asyncRoute(async (req, res) => {
          const value = schema(req.body, true)
          const record = await collection.update(rows => {
            const index = rows.findIndex(r => r.id === req.params.id)
            if (index < 0) throw new AppError(404, 'Record not found')
            rows[index] = { ...rows[index], ...value }
            return rows[index]
          })
          res.json(record)
        })
      )
    app.delete(
      `/api/${route}/:id`,
      requireAdminAuth,
      asyncRoute(async (req, res) => {
        await collection.update(rows => {
          const index = rows.findIndex(r => r.id === req.params.id)
          if (index < 0) throw new AppError(404, 'Record not found')
          rows.splice(index, 1)
        })
        res.json({ message: 'Deleted successfully' })
      })
    )
  }
}

// Public, read-only views of one event for sharing: a calendar file and a
// link-preview page. Hidden or unknown events are treated as not found, so a
// draft never leaks through a guessed id.
function mountEventShare(app, collection) {
  const findPublic = async id => {
    const event = (await collection.read()).find(e => e.id === id)
    return event && event.isVisible !== false ? event : null
  }
  app.get(
    '/api/events/:id/calendar.ics',
    asyncRoute(async (req, res) => {
      const event = await findPublic(req.params.id)
      const ics = event && buildEventIcs(event)
      if (!ics) throw new AppError(404, 'Event not found')
      const slug = (event.title.toLowerCase().match(/[a-z0-9]+/g) || ['event']).join('-')
      res
        .type('text/calendar; charset=utf-8')
        .set('Content-Disposition', `inline; filename="${slug}.ics"`)
        .send(ics)
    })
  )
  app.get(
    '/api/share/events/:id',
    asyncRoute(async (req, res) => {
      const event = await findPublic(req.params.id)
      // A stale share link still lands somewhere useful.
      if (!event || !eventDateISO(event.date)) return res.redirect(302, '/events')
      res.type('html').set('Cache-Control', 'public, max-age=300').send(buildEventShareHtml(event))
    })
  )
}
