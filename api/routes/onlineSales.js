import rateLimit from 'express-rate-limit'
import { createCollection } from '../services/persistence.js'
import { AppError, dependencyError } from '../middleware/errorHandler.js'
import { requireAdminAuth } from '../auth.js'
import { object, string, number, boolean } from '../schemas/validation.js'
import {
  getSquareInventoryReport,
  getSquareCatalogItem,
  resolveTopLevelCategoryMap,
  createSquarePaymentLink,
} from '../squarePosClient.js'
import { isMagicCategory, onlineQuantity, shopReserve } from '../onlineSales.js'
import { SITE_URL } from '../siteUrl.js'

// Register catch-alls for singles ("Magic singles") are rung up in store only.
const SINGLES_ITEM_NAME = /\bsingles\b/i

const variationLabel = (itemName, variationName) =>
  variationName && variationName !== 'Regular'
    ? `${itemName} - ${variationName}`
    : itemName || 'Unnamed item'

// A buyer refreshing or double-tapping is fine; a script minting checkout
// links in a loop is not.
const checkoutRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many checkout attempts, please try again in a few minutes' },
})

// Online ordering: which Magic products an admin has switched on (stored in
// Redis as { itemId, enabledAt } rows), the admin list that switches them,
// and the public endpoint that turns a product into a Square checkout link.
export function mountOnlineSales(app, { redisClient, isRedisConnected, persistent }) {
  const optIns = createCollection(
    { redisClient, isRedisConnected, persistent },
    'outpost:onlineSales'
  )

  // Fails closed: if the switches can't be read, nothing is for sale online.
  const enabledItemIds = async () => {
    try {
      return new Set((await optIns.read()).map(row => row.itemId))
    } catch {
      return new Set()
    }
  }

  app.get('/api/square/online-sales', requireAdminAuth, async (req, res) => {
    try {
      const [report, enabled] = await Promise.all([
        getSquareInventoryReport(process.env),
        optIns.read(),
      ])
      const enabledIds = new Set(enabled.map(row => row.itemId))
      const byItem = new Map()
      for (const row of report.items) {
        if (!isMagicCategory(row.categoryName) || !row.sellable || !row.trackInventory) continue
        if (!row.priceCents || SINGLES_ITEM_NAME.test(row.displayName)) continue
        let item = byItem.get(row.itemId)
        if (!item) {
          item = {
            itemId: row.itemId,
            name: row.itemName || row.displayName,
            imageUrl: row.imageUrl,
            enabled: enabledIds.has(row.itemId),
            variations: [],
          }
          byItem.set(row.itemId, item)
        }
        const quantity = Math.max(0, row.quantity ?? 0)
        item.variations.push({
          id: row.id,
          name: row.displayName,
          priceCents: row.priceCents,
          quantity,
          reserve: shopReserve(row.displayName),
          onlineQuantity: onlineQuantity(quantity, row.displayName),
        })
      }
      const items = [...byItem.values()].sort((a, b) => a.name.localeCompare(b.name))
      res.json({ ok: true, items })
    } catch (error) {
      return dependencyError(error, req, res)
    }
  })

  // Body { enabled: boolean }. Admin auth comes from the /api/square guard in
  // square.js; checked again here so this route never depends on mount order.
  app.put('/api/square/online-sales/:itemId', requireAdminAuth, async (req, res, next) => {
    try {
      object(req.body, ['enabled'], ['enabled'])
      boolean(req.body.enabled, 'enabled')
      const { itemId } = req.params
      if (req.body.enabled) {
        const item = await getSquareCatalogItem(itemId, process.env)
        const { topOf } = await resolveTopLevelCategoryMap(process.env)
        const top = item.categories[0] ? topOf(item.categories[0].id) : null
        if (!isMagicCategory(top?.name))
          throw new AppError(422, 'Only Magic: The Gathering products can be sold online for now')
      }
      await optIns.update(rows => {
        const index = rows.findIndex(row => row.itemId === itemId)
        if (req.body.enabled && index === -1)
          rows.push({ itemId, enabledAt: new Date().toISOString() })
        if (!req.body.enabled && index !== -1) rows.splice(index, 1)
      })
      res.json({ ok: true, itemId, enabled: req.body.enabled })
    } catch (error) {
      if (error instanceof AppError) return next(error)
      return dependencyError(error, req, res)
    }
  })

  // Public. Body { itemId, variationId, quantity }. Every rule is checked
  // against Square live (not the public catalog cache, which can be an hour
  // old) so a sell-out or a switched-off item can't be bought from a stale page.
  app.post('/api/checkout', checkoutRateLimiter, async (req, res, next) => {
    try {
      object(req.body, ['itemId', 'variationId', 'quantity'], ['itemId', 'variationId', 'quantity'])
      string(req.body.itemId, 'itemId')
      string(req.body.variationId, 'variationId')
      number(req.body.quantity, 'quantity', 1, true)
      const { itemId, variationId, quantity } = req.body

      const notForSale = new AppError(404, "This product isn't available to buy online")
      if (!(await enabledItemIds()).has(itemId)) throw notForSale

      const item = await getSquareCatalogItem(itemId, process.env)
      const variation = item.variations.find(v => v.id === variationId)
      const { topOf } = await resolveTopLevelCategoryMap(process.env)
      const top = item.categories[0] ? topOf(item.categories[0].id) : null
      if (
        !variation ||
        !isMagicCategory(top?.name) ||
        !variation.sellable ||
        !variation.trackInventory ||
        !(variation.priceCents > 0)
      )
        throw notForSale

      const label = variationLabel(item.name, variation.name)
      const available = onlineQuantity(variation.quantity, label)
      if (quantity > available) {
        return res.status(409).json({
          error: available
            ? `Only ${available} left to buy online`
            : 'Sold out online. Ask us in store.',
          available,
        })
      }

      const link = await createSquarePaymentLink(
        {
          variationId,
          quantity,
          redirectUrl: `${SITE_URL}/order/thanks`,
          note: 'Website order, pick up in store',
        },
        process.env
      )
      res.json({ ok: true, url: link.url })
    } catch (error) {
      if (error instanceof AppError) return next(error)
      return dependencyError(error, req, res)
    }
  })

  return { enabledItemIds }
}
