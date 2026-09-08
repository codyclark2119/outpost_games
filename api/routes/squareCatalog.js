import { validImageUpload } from '../schemas/square.js'
import { dependencyError } from '../middleware/errorHandler.js'
import {
  listSquareCategories,
  getSquareCatalogItem,
  updateSquareCatalogItem,
  createSquareCategory,
  renameSquareCategory,
  reparentSquareCategory,
  deleteSquareCategory,
  mergeSquareCategories,
  deleteSquareCatalogItem,
  deleteSquareCatalogVariation,
  addSquareCatalogVariation,
  deleteSquareCatalogItemsBatch,
  setSquareCatalogItemsCategoryBatch,
  setSquareCatalogItemsVisibilityBatch,
  setSquareCatalogItemsReleasedAtBatch,
  uploadSquareCatalogImage,
} from '../squarePosClient.js'
import { requireAdminAuth } from '../auth.js'
import multer from 'multer'
export function mountSquareCatalog(app, { invalidatePublicCatalog }) {
  app.get('/api/square/categories', requireAdminAuth, async (req, res) => {
    try {
      const categories = await listSquareCategories(process.env)
      res.json({ ok: true, categories })
    } catch (error) {
      return dependencyError(error, req, res)
    }
  })

  app.post('/api/square/categories', requireAdminAuth, async (req, res) => {
    try {
      const { name, parentCategoryId } = req.body || {}
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Category name is required' })
      }

      const category = await createSquareCategory(
        { name: name.trim(), parentCategoryId: parentCategoryId || null },
        process.env
      )
      res.json({ ok: true, category })
    } catch (error) {
      return dependencyError(error, req, res)
    }
  })

  app.put('/api/square/categories/:categoryId', requireAdminAuth, async (req, res) => {
    try {
      const { name } = req.body || {}
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Category name is required' })
      }

      const category = await renameSquareCategory(req.params.categoryId, name.trim(), process.env)
      invalidatePublicCatalog()
      res.json({ ok: true, category })
    } catch (error) {
      return dependencyError(error, req, res)
    }
  })

  app.put('/api/square/categories/:categoryId/parent', requireAdminAuth, async (req, res) => {
    try {
      const parentCategoryId = req.body?.parentCategoryId ?? null
      const category = await reparentSquareCategory(
        req.params.categoryId,
        parentCategoryId,
        process.env
      )
      invalidatePublicCatalog()
      res.json({ ok: true, category })
    } catch (error) {
      return dependencyError(error, req, res)
    }
  })

  app.delete('/api/square/categories/:categoryId', requireAdminAuth, async (req, res) => {
    try {
      await deleteSquareCategory(req.params.categoryId, process.env)
      invalidatePublicCatalog()
      res.json({ ok: true })
    } catch (error) {
      return dependencyError(error, req, res)
    }
  })

  app.post('/api/square/categories/:fromCategoryId/merge', requireAdminAuth, async (req, res) => {
    try {
      const { toCategoryId } = req.body || {}
      if (!toCategoryId) {
        return res.status(400).json({ error: 'toCategoryId is required' })
      }
      if (toCategoryId === req.params.fromCategoryId) {
        return res.status(400).json({ error: 'Cannot merge a category into itself' })
      }

      const result = await mergeSquareCategories(
        req.params.fromCategoryId,
        toCategoryId,
        process.env
      )
      invalidatePublicCatalog()
      res.json({ ok: true, mergedItemCount: result.mergedItemCount })
    } catch (error) {
      return dependencyError(error, req, res)
    }
  })

  app.get('/api/square/products/:itemId', requireAdminAuth, async (req, res) => {
    try {
      const item = await getSquareCatalogItem(req.params.itemId, process.env)
      res.json({ ok: true, item })
    } catch (error) {
      return dependencyError(error, req, res)
    }
  })

  app.put('/api/square/products/:itemId', requireAdminAuth, async (req, res) => {
    try {
      const body = req.body || {}
      const touchesSku =
        Object.prototype.hasOwnProperty.call(body, 'sku') ||
        (body.variations || []).some(variation =>
          Object.prototype.hasOwnProperty.call(variation, 'sku')
        )
      if (touchesSku) {
        return res.status(400).json({
          error: 'SKU cannot be edited here — it is locked to protect in-store barcode scanning',
        })
      }
      if (body.releasedAt != null && !/^\d{4}-\d{2}-\d{2}$/.test(body.releasedAt)) {
        return res.status(400).json({ error: 'releasedAt must be an ISO date (YYYY-MM-DD)' })
      }

      const updated = await updateSquareCatalogItem(req.params.itemId, body, process.env)
      invalidatePublicCatalog()
      res.json({ ok: true, item: updated })
    } catch (error) {
      return dependencyError(error, req, res)
    }
  })

  app.delete('/api/square/products/:itemId', requireAdminAuth, async (req, res) => {
    try {
      const result = await deleteSquareCatalogItem(req.params.itemId, process.env)
      invalidatePublicCatalog()
      res.json({ ok: true, deletedIds: result.deleted_object_ids || [] })
    } catch (error) {
      return dependencyError(error, req, res)
    }
  })

  // Bulk actions (admin multi-select). AdminSquareCatalog.vue's list is one row
  // per variation, so selection is keyed by itemId — every route here operates
  // on whole ITEMs, chunked internally via Square's real batch endpoints.
  app.post('/api/square/products/batch-delete', requireAdminAuth, async (req, res) => {
    try {
      const itemIds = Array.isArray(req.body?.itemIds) ? req.body.itemIds : []
      if (!itemIds.length)
        return res.status(400).json({ error: 'itemIds must be a non-empty array' })

      const result = await deleteSquareCatalogItemsBatch(itemIds, process.env)
      invalidatePublicCatalog()
      res.json({ ok: true, deletedIds: result.deletedIds })
    } catch (error) {
      return dependencyError(error, req, res)
    }
  })

  app.post('/api/square/products/batch-category', requireAdminAuth, async (req, res) => {
    try {
      const itemIds = Array.isArray(req.body?.itemIds) ? req.body.itemIds : []
      if (!itemIds.length)
        return res.status(400).json({ error: 'itemIds must be a non-empty array' })
      const categoryId = req.body?.categoryId ?? null

      const result = await setSquareCatalogItemsCategoryBatch(itemIds, categoryId, process.env)
      invalidatePublicCatalog()
      res.json({ ok: true, updatedCount: result.objects.length })
    } catch (error) {
      return dependencyError(error, req, res)
    }
  })

  app.post('/api/square/products/batch-visibility', requireAdminAuth, async (req, res) => {
    try {
      const itemIds = Array.isArray(req.body?.itemIds) ? req.body.itemIds : []
      if (!itemIds.length)
        return res.status(400).json({ error: 'itemIds must be a non-empty array' })
      const { hiddenFromWeb, sellable } = req.body || {}
      if (hiddenFromWeb === undefined && sellable === undefined) {
        return res.status(400).json({ error: 'hiddenFromWeb and/or sellable is required' })
      }

      const result = await setSquareCatalogItemsVisibilityBatch(
        itemIds,
        { hiddenFromWeb, sellable },
        process.env
      )
      invalidatePublicCatalog()
      res.json({ ok: true, updatedCount: result.objects.length })
    } catch (error) {
      return dependencyError(error, req, res)
    }
  })

  app.post('/api/square/products/batch-released-at', requireAdminAuth, async (req, res) => {
    try {
      const itemIds = Array.isArray(req.body?.itemIds) ? req.body.itemIds : []
      if (!itemIds.length)
        return res.status(400).json({ error: 'itemIds must be a non-empty array' })
      const releasedAt = req.body?.releasedAt ?? null
      if (releasedAt !== null && !/^\d{4}-\d{2}-\d{2}$/.test(releasedAt)) {
        return res
          .status(400)
          .json({ error: 'releasedAt must be an ISO date (YYYY-MM-DD) or null' })
      }

      const result = await setSquareCatalogItemsReleasedAtBatch(itemIds, releasedAt, process.env)
      invalidatePublicCatalog()
      res.json({ ok: true, updatedCount: result.objects.length })
    } catch (error) {
      return dependencyError(error, req, res)
    }
  })

  app.delete(
    '/api/square/products/:itemId/variations/:variationId',
    requireAdminAuth,
    async (req, res) => {
      try {
        const result = await deleteSquareCatalogVariation(
          req.params.itemId,
          req.params.variationId,
          process.env
        )
        invalidatePublicCatalog()
        res.json({ ok: true, deletedIds: result.deleted_object_ids || [] })
      } catch (error) {
        return dependencyError(error, req, res)
      }
    }
  )

  app.post('/api/square/products/:itemId/variations', requireAdminAuth, async (req, res) => {
    try {
      const { name, sku, priceCents, trackInventory, sellable } = req.body || {}
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Variation name is required' })
      }
      if (
        priceCents !== undefined &&
        priceCents !== null &&
        (!Number.isFinite(priceCents) || priceCents < 0)
      ) {
        return res.status(400).json({ error: 'priceCents must be a non-negative number' })
      }

      await addSquareCatalogVariation(
        req.params.itemId,
        {
          name: name.trim(),
          sku: sku?.trim() || undefined,
          priceCents: priceCents ?? null,
          trackInventory,
          sellable,
        },
        process.env
      )
      const item = await getSquareCatalogItem(req.params.itemId, process.env)
      invalidatePublicCatalog()
      res.status(201).json({ ok: true, item })
    } catch (error) {
      return dependencyError(error, req, res)
    }
  })

  const imageUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }, // Square's own max: 15MB
    fileFilter: (req, file, cb) => {
      if (!['image/jpeg', 'image/pjpeg', 'image/png', 'image/gif'].includes(file.mimetype)) {
        return cb(new Error('Only JPEG, PNG, or GIF images are supported'))
      }
      cb(null, true)
    },
  })

  app.post('/api/square/products/:itemId/image', requireAdminAuth, (req, res) => {
    imageUpload.single('image')(req, res, async uploadError => {
      if (uploadError) {
        return res.status(400).json({ error: uploadError.message })
      }
      if (!validImageUpload(req.file, req.body)) {
        return res
          .status(400)
          .json({ error: 'A valid JPEG, PNG, or GIF image without extra metadata is required' })
      }

      try {
        const result = await uploadSquareCatalogImage(
          req.params.itemId,
          {
            buffer: req.file.buffer,
            filename: req.file.originalname,
            mimeType: req.file.mimetype,
          },
          process.env
        )
        invalidatePublicCatalog()
        res.json({ ok: true, imageUrl: result.imageUrl })
      } catch (error) {
        return dependencyError(error, req, res)
      }
    })
  })

  // A variation's own photo (distinct from the item's shared group photo) —
  // e.g. "Foil Enhanced" needing different art than "Regular". Square's
  // CreateCatalogImage endpoint accepts an ITEM_VARIATION id the same way it
  // does an ITEM id, so this reuses the identical upload/reorder logic.
  app.post(
    '/api/square/products/:itemId/variations/:variationId/image',
    requireAdminAuth,
    (req, res) => {
      imageUpload.single('image')(req, res, async uploadError => {
        if (uploadError) {
          return res.status(400).json({ error: uploadError.message })
        }
        if (!validImageUpload(req.file, req.body)) {
          return res
            .status(400)
            .json({ error: 'A valid JPEG, PNG, or GIF image without extra metadata is required' })
        }

        try {
          const result = await uploadSquareCatalogImage(
            req.params.variationId,
            {
              buffer: req.file.buffer,
              filename: req.file.originalname,
              mimeType: req.file.mimetype,
            },
            process.env
          )
          invalidatePublicCatalog()
          res.json({ ok: true, imageUrl: result.imageUrl })
        } catch (error) {
          return dependencyError(error, req, res)
        }
      })
    }
  )
}
