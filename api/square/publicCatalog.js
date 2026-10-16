import { isMagicCategory, onlineQuantity } from '../lib/onlineSales.js'
import { listSquareCatalogItems } from './catalog.js'
import { resolveTopLevelCategoryMap } from './categories.js'
import { resolveSquareCredentials, resolveSquareEnvironment } from './client.js'
import { listSquareInventory } from './inventory.js'

// Categories the public site never shows even if they're sellable in Square —
// e.g. snacks/concessions sold in-store but out of scope for the TCG-only
// public catalog, accessories (sold in-store only, not part of the online
// card-shop catalog), and tournament entries (event fees rung up at the
// register, not products — events are advertised on /events instead).
// Matched case-insensitively against the item's
// top-level category name, so tagging a new item under one of these just
// works with no code change; anything not listed here shows up on the public
// site by default.
const PUBLIC_CATALOG_EXCLUDED_CATEGORIES = [
  'snacks',
  'food',
  'drinks',
  'concessions',
  'accessories',
  'tournaments',
]

// Singles (individual cards) aren't listed online — pricing moves too fast to
// keep in sync — so the public catalog hides anything filed under a
// "Single"/"Singles" category, plus the register's catch-all singles items by
// name ("Magic singles", "Rift Singles"). The name check is plural-only on
// purpose: sealed "Single Booster Pack" products must stay listed.
const SINGLES_CATEGORY = /\bsingles?\b/i

const SINGLES_ITEM_NAME = /\bsingles\b/i

// Display order for the public catalog's category sections: the shop's five
// headline games always lead, in this exact sequence, when present; every
// other category falls in after, ranked by how much is actually on hand
// (busiest categories first). One Piece and Gundam are their own top-level
// categories in Square (formerly both under a combined "Bandai" parent).
const PINNED_CATEGORY_ORDER = ['magic', 'pokemon', 'one piece', 'gundam', 'riftbound']

// Public-facing catalog: sellable items only, grouped by top-level category,
// with non-TCG categories (snacks, etc.) filtered out entirely. Internal
// fields (SKU, raw inventory state) are intentionally left off this shape —
// it's meant to be served to customers, unlike getSquareInventoryReport above.
export const getPublicSquareCatalog = async (env = process.env) => {
  const variations = await listSquareCatalogItems(env)
  const locationId = resolveSquareCredentials(env).locationId
  // hiddenFromWeb is an explicit admin decision to keep this item off the
  // public site regardless of current stock — checked here (not just via the
  // in-stock filter below) so a hidden item never reappears just because it
  // has quantity on hand.
  const sellableVariations = variations.filter(
    variation => variation.sellable && !variation.hiddenFromWeb
  )
  const trackedVariations = sellableVariations.filter(variation => variation.trackInventory)

  const [counts, { topOf, nameOf }] = await Promise.all([
    locationId && trackedVariations.length
      ? listSquareInventory(env, {
          catalogObjectIds: trackedVariations.map(variation => variation.id),
          locationIds: [locationId],
        })
      : Promise.resolve([]),
    resolveTopLevelCategoryMap(env),
  ])
  const countByVariationId = new Map(counts.map(count => [count.catalog_object_id, count]))

  // The public site only ever shows items actually available right now — out-of-stock
  // items are still visible internally via the admin stock report, just not here. No
  // tracked count at all means Square isn't keeping stock for this variation
  // (made-to-order, custom work, etc.), so it's treated as available; a tracked
  // variation only counts as in stock once its on-hand quantity is over zero.
  const isInStock = variation => {
    if (!variation.trackInventory) return true
    const count = countByVariationId.get(variation.id)
    return Boolean(count && Number(count.quantity) > 0)
  }

  // Single pass: filters to in-stock + non-excluded, builds the public item
  // shape, and tallies on-hand quantity per category for the ordering below —
  // all in one loop rather than several chained filter/map passes, since the
  // per-category tally needs quantity that the returned item shape omits.
  const rawItems = []
  const stockByCategory = new Map()

  for (const variation of sellableVariations) {
    if (!isInStock(variation)) continue

    const leafId = variation.categoryIds?.[0] || null
    const topCategory = leafId ? topOf(leafId) : null
    const categoryName = topCategory?.name || 'Uncategorized'
    if (PUBLIC_CATALOG_EXCLUDED_CATEGORIES.includes(categoryName.trim().toLowerCase())) continue

    // "Set" is the item's immediate/leaf category (e.g. "Bloomburrow" under
    // Magic > Pre-cons > Bloomburrow) — distinct from the top-level game-type
    // category used for grouping above. An item assigned directly to the
    // top-level category (no real subcategory) has no set of its own.
    const hasSet = Boolean(leafId && leafId !== topCategory?.id)
    const setId = hasSet ? leafId : null
    const setName = hasSet ? nameOf(leafId) : null

    const name =
      variation.variationName && variation.variationName !== 'Regular'
        ? `${variation.name} - ${variation.variationName}`
        : variation.name || 'Unnamed item'
    if (
      SINGLES_CATEGORY.test(setName || '') ||
      SINGLES_CATEGORY.test(categoryName) ||
      SINGLES_ITEM_NAME.test(name)
    )
      continue

    const count = countByVariationId.get(variation.id)
    const quantity = variation.trackInventory ? Number(count?.quantity ?? 0) : 0
    stockByCategory.set(categoryName, (stockByCategory.get(categoryName) || 0) + quantity)

    rawItems.push({
      id: variation.id,
      itemId: variation.itemId,
      name,
      priceCents: variation.priceCents,
      currency: variation.currency,
      imageUrl: variation.imageUrl,
      categoryId: topCategory?.id || null,
      categoryName,
      setId,
      setName,
      releasedAt: variation.releasedAt,
      itemCreatedAt: variation.itemCreatedAt,
      // How many could be bought online if an admin switches this item on
      // (see api/lib/onlineSales.js). The public-catalog route zeroes it for every
      // item that isn't switched on, so this alone never makes anything buyable.
      onlineQuantity:
        isMagicCategory(categoryName) && variation.trackInventory && variation.priceCents > 0
          ? onlineQuantity(quantity, name)
          : 0,
    })
  }

  const categoryNames = [...stockByCategory.keys()]
  const pinned = PINNED_CATEGORY_ORDER.map(lower =>
    categoryNames.find(name => name.trim().toLowerCase() === lower)
  ).filter(Boolean)
  const middle = categoryNames
    .filter(name => !pinned.includes(name))
    .sort((a, b) => (stockByCategory.get(b) || 0) - (stockByCategory.get(a) || 0))

  const categoryRank = new Map([...pinned, ...middle].map((name, index) => [name, index]))
  // Primary key: category order (pinned games first, then by stock). Secondary
  // key: newest item first within a category — the default browse order the
  // public site wants. Prefers the admin-set `releasedAt` (outpost_released_at,
  // see above) over Square's own item-level created_at, since created_at
  // reflects whenever the catalog entry was last created/touched in Square
  // (bulk imports/cleanups skew it) rather than when the product actually
  // became available. Items with neither sort last rather than falsely
  // claiming to be newest.
  const sortDateMs = item => {
    const raw = item.releasedAt || item.itemCreatedAt
    return raw ? new Date(raw).getTime() : -Infinity
  }
  const items = rawItems.sort((a, b) => {
    const rankDiff = categoryRank.get(a.categoryName) - categoryRank.get(b.categoryName)
    if (rankDiff !== 0) return rankDiff
    return sortDateMs(b) - sortDateMs(a)
  })

  return {
    fetchedAt: new Date().toISOString(),
    environment: resolveSquareEnvironment(env),
    itemCount: items.length,
    items,
  }
}
