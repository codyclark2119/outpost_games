import crypto from 'node:crypto'
import { requireAdminAuth } from '../auth.js'
import { asyncRoute, AppError } from '../middleware/errorHandler.js'
import { createCollection } from '../services/persistence.js'
import { validateEvent } from '../schemas/events.js'
import { object, string, invalid, validIsoDate } from '../schemas/validation.js'
export function validateOverride(body) {
  object(body, ['weeklyEventId', 'date', 'reason'], ['weeklyEventId', 'date'])
  string(body.weeklyEventId, 'weeklyEventId')
  if (!validIsoDate(body.date)) invalid('date must be a real YYYY-MM-DD date')
  if ('reason' in body) string(body.reason, 'reason', true)
  return body
}
export function mountRecords(app, dependencies) {
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
    const collection = createCollection(dependencies, key)
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
