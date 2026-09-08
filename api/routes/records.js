import crypto from 'node:crypto'
import { requireAdminAuth } from '../auth.js'
import { asyncRoute, AppError } from '../middleware/errorHandler.js'
import { createCollection } from '../services/persistence.js'
import { validateEvent } from '../schemas/events.js'
import { object, string, number, invalid, validIsoDate } from '../schemas/validation.js'
const shopUrl = 'https://www.tcgplayer.com/search/all/product?seller=61af7a3a&view=grid&page=1'
const listingFields = [
  'name',
  'setName',
  'price',
  'condition',
  'foiling',
  'quantityInStock',
  'imageUrl',
  'productUrl',
  'priceDisplay',
]
export function validateListing(body, partial = false) {
  object(body, listingFields, partial ? [] : ['name', 'setName', 'price'])
  if (!Object.keys(body).length) invalid('At least one field is required')
  for (const f of ['name', 'setName', 'condition', 'foiling', 'priceDisplay'])
    if (f in body) string(body[f], f)
  if ('condition' in body && !['NM', 'LP', 'MP', 'HP', 'DMG'].includes(body.condition))
    invalid('Unknown condition')
  if ('foiling' in body && !['Normal', 'Foil', 'Etched'].includes(body.foiling))
    invalid('Unknown foiling')
  if ('price' in body) number(body.price, 'price')
  if ('quantityInStock' in body) number(body.quantityInStock, 'quantityInStock', 0, true)
  for (const f of ['imageUrl', 'productUrl'])
    if (body[f] != null && body[f] !== '') {
      try {
        if (!['https:', 'http:'].includes(new URL(body[f]).protocol))
          invalid(`${f} must use HTTP or HTTPS`)
      } catch {
        invalid(`${f} must be a URL`)
      }
    }
  return body
}
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
    ['tcgplayer-listings', 'outpost:tcgplayer:listings', validateListing],
  ]) {
    const collection = createCollection(dependencies, key)
    app.get(
      `/api/${route}`,
      asyncRoute(async (req, res) => {
        const rows = await collection.read()
        if (route !== 'tcgplayer-listings') return res.json(rows)
        const page = Number(req.query.page ?? 1),
          limit = Number(req.query.limit ?? 20)
        number(page, 'page', 1, true)
        number(limit, 'limit', 1, true)
        if (limit > 1000) invalid('limit must be <= 1000')
        const listings = rows.slice((page - 1) * limit, page * limit)
        res.json({
          listings,
          page,
          limit,
          totalResults: listings.length,
          totalListings: rows.length,
          timestamp: new Date().toISOString(),
          shopUrl,
        })
      })
    )
    app.post(
      `/api/${route}`,
      requireAdminAuth,
      asyncRoute(async (req, res) => {
        const value = schema(req.body, false)
        const record = { id: crypto.randomUUID(), ...value }
        if (route === 'tcgplayer-listings')
          Object.assign(record, {
            condition: value.condition ?? 'NM',
            foiling: value.foiling ?? 'Normal',
            quantityInStock: value.quantityInStock ?? 1,
            imageUrl: value.imageUrl || null,
            productUrl: value.productUrl || shopUrl,
            priceDisplay: value.priceDisplay || `$${value.price.toFixed(2)}`,
            seller: 'The Outpost Games',
            createdAt: new Date().toISOString(),
          })
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
            if (route === 'tcgplayer-listings') {
              rows[index].updatedAt = new Date().toISOString()
              if ('price' in value && !value.priceDisplay)
                rows[index].priceDisplay = `$${value.price.toFixed(2)}`
            }
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
    if (route === 'tcgplayer-listings')
      app.delete(
        `/api/${route}`,
        requireAdminAuth,
        asyncRoute(async (_req, res) => {
          await collection.update(rows => {
            rows.length = 0
          })
          res.json({ message: 'All listings cleared successfully' })
        })
      )
  }
}
