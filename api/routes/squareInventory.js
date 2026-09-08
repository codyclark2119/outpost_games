import { createCollection } from '../services/persistence.js'
import { AppError } from '../middleware/errorHandler.js'
import { dependencyError } from '../middleware/errorHandler.js'
import crypto from 'node:crypto'
import {
  getSquareInventoryReport,
  getSquareCatalogItem,
  adjustSquareInventoryCount,
  adjustSquareInventoryCountBatch,
  applyBoxToPackRestock,
  resolveSquareCredentials,
} from '../squarePosClient.js'
import { requireAdminAuth } from '../auth.js'
export function mountSquareInventory(
  app,
  { redisClient, isRedisConnected, requireProductionPersistence, invalidatePublicCatalog }
) {
  app.post('/api/square/products/:itemId/inventory', requireAdminAuth, async (req, res) => {
    try {
      const quantity = Number(req.body?.quantity)
      const { variationId } = req.body || {}
      if (!Number.isFinite(quantity) || quantity < 0) {
        return res.status(400).json({ error: 'quantity must be a non-negative number' })
      }
      if (!variationId) {
        return res.status(400).json({ error: 'variationId is required' })
      }

      const item = await getSquareCatalogItem(req.params.itemId, process.env)
      if (!item.variations.some(variation => variation.id === variationId)) {
        return res.status(422).json({ error: 'That variation does not belong to this item' })
      }

      const { locationId } = resolveSquareCredentials(process.env)
      await adjustSquareInventoryCount(variationId, { quantity, locationId }, process.env)
      invalidatePublicCatalog()
      res.json({ ok: true, quantity })
    } catch (error) {
      return dependencyError(error, req, res)
    }
  })

  app.post('/api/square/inventory/batch', requireAdminAuth, async (req, res) => {
    try {
      const changes = Array.isArray(req.body?.changes) ? req.body.changes : []
      if (!changes.length) {
        return res.status(400).json({ error: 'changes must be a non-empty array' })
      }
      for (const change of changes) {
        const quantity = Number(change.quantity)
        if (!change.variationId || !Number.isFinite(quantity) || quantity < 0) {
          return res
            .status(400)
            .json({ error: 'Each change requires a variationId and a non-negative quantity' })
        }
      }

      // Validate every variationId against a fresh report rather than trusting
      // client-supplied ids blindly, matching the single-item inventory route.
      const report = await getSquareInventoryReport(process.env)
      const knownVariationIds = new Set(report.items.map(item => item.id))
      const unknownIds = changes.map(c => c.variationId).filter(id => !knownVariationIds.has(id))
      if (unknownIds.length) {
        return res.status(422).json({ error: 'Unknown variation id(s)', unknownIds })
      }

      const result = await adjustSquareInventoryCountBatch(
        changes.map(c => ({ variationId: c.variationId, quantity: Number(c.quantity) })),
        process.env
      )
      invalidatePublicCatalog()
      res.json({ ok: true, updatedCount: result.updatedCount })
    } catch (error) {
      return dependencyError(error, req, res)
    }
  })

  // Quick Restock — persisted box-of-sealed-packs -> loose-pack pairings.
  // Square has no native "kit"/bundle concept for this (confirmed via Square's
  // own developer forum), so the relationship itself lives here in Redis, same
  // convention as outpost:tcgplayer:listings — plain flat CRUD, no TTL/
  // orchestration complexity.
  const mappingsStore = createCollection(
    { redisClient, isRedisConnected, persistent: requireProductionPersistence },
    'outpost:square:restock-mappings'
  )

  app.get('/api/square/restock-mappings', requireAdminAuth, async (req, res) => {
    try {
      res.json({ ok: true, mappings: await mappingsStore.read() })
    } catch (error) {
      return dependencyError(error, req, res)
    }
  })

  app.post('/api/square/restock-mappings', requireAdminAuth, async (req, res) => {
    try {
      const { boxVariationId, boxName, packsVariationId, packsName, packsPerBox } = req.body || {}
      if (!boxVariationId || !packsVariationId) {
        return res.status(400).json({ error: 'boxVariationId and packsVariationId are required' })
      }
      if (boxVariationId === packsVariationId) {
        return res.status(400).json({ error: 'Box and packs must be different variations' })
      }
      if (!Number.isInteger(packsPerBox) || packsPerBox <= 0) {
        return res.status(400).json({ error: 'packsPerBox must be a positive integer' })
      }

      // Validate both ids are real, current variations rather than trusting
      // client-supplied ids blindly, matching the existing batch-inventory route.
      const report = await getSquareInventoryReport(process.env)
      const knownVariationIds = new Set(report.items.map(item => item.id))
      if (!knownVariationIds.has(boxVariationId) || !knownVariationIds.has(packsVariationId)) {
        return res.status(422).json({ error: 'Unknown variation id(s)' })
      }

      const mapping = {
        id: crypto.randomUUID(),
        boxVariationId,
        boxName: boxName || '',
        packsVariationId,
        packsName: packsName || '',
        packsPerBox,
      }

      await mappingsStore.update(mappings => {
        mappings.push(mapping)
      })
      res.status(201).json({ ok: true, mapping })
    } catch (error) {
      return dependencyError(error, req, res)
    }
  })

  app.delete('/api/square/restock-mappings/:id', requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params

      await mappingsStore.update(mappings => {
        const index = mappings.findIndex(m => m.id === id)
        if (index < 0) throw new AppError(404, 'Restock mapping not found')
        mappings.splice(index, 1)
      })
      res.json({ ok: true })
    } catch (error) {
      return dependencyError(error, req, res)
    }
  })

  app.post('/api/square/restock-mappings/:id/apply', requireAdminAuth, async (req, res) => {
    try {
      const boxesOpened = Number(req.body?.boxesOpened)
      if (!Number.isInteger(boxesOpened) || boxesOpened <= 0) {
        return res.status(400).json({ error: 'boxesOpened must be a positive integer' })
      }

      const mappings = await mappingsStore.read()
      const mapping = mappings.find(m => m.id === req.params.id)
      if (!mapping) return res.status(404).json({ error: 'Restock mapping not found' })

      const result = await applyBoxToPackRestock(
        {
          boxVariationId: mapping.boxVariationId,
          packsVariationId: mapping.packsVariationId,
          packsPerBox: mapping.packsPerBox,
          boxesOpened,
        },
        process.env
      )
      invalidatePublicCatalog()
      res.json({ ok: true, ...result })
    } catch (error) {
      return dependencyError(error, req, res)
    }
  })
}
