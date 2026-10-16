import { mountSquareCatalog } from './squareCatalog.js'
import { mountSquareInventory } from './squareInventory.js'
import { mountSquareSales } from './squareSales.js'
import { mountOnlineSales } from './onlineSales.js'

import { dependencyError } from '../middleware/errorHandler.js'
import { validateSquareMutation } from '../schemas/square.js'
import { unavailable } from '../services/persistence.js'

import { getSquareInventoryReport } from '../square/index.js'

import {
  getCachedPublicSquareCatalog,
  refreshSquarePublicCatalog,
} from '../squarePublicCatalogCache.js'
import { requireAdminAuth } from '../auth.js'

export function mountSquare(app, store) {
  app.use('/api/square', (req, res, next) => {
    if (['POST', 'PUT', 'DELETE'].includes(req.method))
      return requireAdminAuth(req, res, error =>
        error ? next(error) : validateSquareMutation(req, res, next)
      )
    next()
  })
  app.use('/api/square/restock-mappings', (req, res, next) => {
    if (store.persistent && !store.isRedisConnected()) return next(unavailable())
    next()
  })

  app.get('/api/square/inventory-report', requireAdminAuth, async (req, res) => {
    try {
      const report = await getSquareInventoryReport(process.env)
      res.json(report)
    } catch (error) {
      return dependencyError(error, req, res)
    }
  })

  // Public, cached, read-only catalog for the customer-facing Products page —
  // deliberately not requireAdminAuth. Never calls Square directly on request;
  // always served from squarePublicCatalogCache's Redis/memory cache, which
  // refreshes itself in the background per its store-hours-aware TTL.
  const { enabledItemIds } = mountOnlineSales(app, store)

  app.get('/api/square/public-catalog', async (req, res) => {
    try {
      const [cache, enabled] = await Promise.all([getCachedPublicSquareCatalog(), enabledItemIds()])
      // Only items an admin switched on keep a "buy online" count.
      const items = (cache.items || []).map(item => ({
        ...item,
        onlineQuantity: enabled.has(item.itemId) ? item.onlineQuantity || 0 : 0,
      }))
      res.json({ ok: true, ...cache, items })
    } catch (error) {
      return dependencyError(error, req, res)
    }
  })

  // Fire-and-forget: called after every admin write that could change what the
  // public Products page shows (image, name, price, category, stock, deletion).
  // Without this, an admin's edit only reaches customers once the store-hours
  // TTL in squarePublicCatalogCache.js next expires (up to an hour open, a day
  // closed) — which reads as "the save didn't work" even though it did.
  const invalidatePublicCatalog = () => {
    refreshSquarePublicCatalog().catch(() => {}) // failure is already logged inside refreshSquarePublicCatalog
  }

  mountSquareCatalog(app, { invalidatePublicCatalog })
  mountSquareInventory(app, store, { invalidatePublicCatalog })
  mountSquareSales(app)
}
