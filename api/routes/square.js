import { mountSquareCatalog } from './squareCatalog.js'
import { mountSquareInventory } from './squareInventory.js'
import { mountSquareSales } from './squareSales.js'

import { dependencyError } from '../middleware/errorHandler.js'
import { validateSquareMutation } from '../schemas/square.js'
import { unavailable } from '../services/persistence.js'

import {
  getSquareConfigurationStatus,
  testSquareConnection,
  getSquareInventoryReport,
} from '../squarePosClient.js'

import {
  getCachedPublicSquareCatalog,
  refreshSquarePublicCatalog,
  getSquarePublicCatalogStatus,
} from '../squarePublicCatalogCache.js'
import { requireAdminAuth } from '../auth.js'

export function mountSquare(app, { redisClient, isRedisConnected, requireProductionPersistence }) {
  app.use('/api/square', (req, res, next) => {
    if (['POST', 'PUT', 'DELETE'].includes(req.method))
      return requireAdminAuth(req, res, error =>
        error ? next(error) : validateSquareMutation(req, res, next)
      )
    next()
  })
  app.use('/api/square/restock-mappings', (req, res, next) => {
    if (requireProductionPersistence && !isRedisConnected()) return next(unavailable())
    next()
  })

  // ─── Square POS Integration (sandbox-first) ─────────────────────────────────
  // This is an additive surface for validating Square POS credentials and catalog
  // access before any production rollout.

  app.get('/api/square/status', requireAdminAuth, async (req, res) => {
    try {
      const status = getSquareConfigurationStatus(process.env)
      res.json({
        ok: true,
        ...status,
        apiBaseUrl:
          status.environment === 'production'
            ? 'https://connect.squareup.com'
            : 'https://connect.squareupsandbox.com',
      })
    } catch (error) {
      return dependencyError(error, req, res)
    }
  })

  app.post('/api/square/test', requireAdminAuth, async (req, res) => {
    try {
      const status = getSquareConfigurationStatus(process.env)
      if (!status.configured) {
        return res.status(422).json({
          ok: false,
          error: 'Square credentials are incomplete',
          message:
            'The Square integration needs SQUARE_ACCESS_TOKEN, SQUARE_APPLICATION_ID, and SQUARE_LOCATION_ID.',
          missingFields: status.missingFields,
        })
      }

      const result = await testSquareConnection(process.env)
      res.json({ ok: true, ...result })
    } catch (error) {
      return dependencyError(error, req, res)
    }
  })

  app.get('/api/square/catalog', requireAdminAuth, async (req, res) => {
    try {
      const { createSquarePosClient, resolveSquareCredentials } =
        await import('../squarePosClient.js')
      const client = createSquarePosClient(resolveSquareCredentials(process.env))
      const payload = await client.request('/v2/catalog/list?types=ITEM')
      res.json({ ok: true, environment: client.environment, items: payload.objects || [] })
    } catch (error) {
      return dependencyError(error, req, res)
    }
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
  app.get('/api/square/public-catalog', async (req, res) => {
    try {
      const cache = await getCachedPublicSquareCatalog()
      res.json({ ok: true, ...cache })
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

  app.post('/api/square/public-catalog/refresh', requireAdminAuth, async (req, res) => {
    try {
      const cache = await refreshSquarePublicCatalog()
      res.json({ ok: true, ...cache })
    } catch (error) {
      return dependencyError(error, req, res)
    }
  })

  app.get('/api/square/public-catalog/status', requireAdminAuth, (req, res) => {
    res.json({ ok: true, ...getSquarePublicCatalogStatus() })
  })

  mountSquareCatalog(app, { invalidatePublicCatalog })
  mountSquareInventory(app, {
    redisClient,
    isRedisConnected,
    requireProductionPersistence,
    invalidatePublicCatalog,
  })
  mountSquareSales(app, {})
}
