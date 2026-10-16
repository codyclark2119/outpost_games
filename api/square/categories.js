import { AppError } from '../middleware/errorHandler.js'
import crypto from 'node:crypto'
import { batchRetrieveSquareCatalogObjects, batchUpsertSquareCatalogObjects } from './batch.js'
import {
  CATALOG_PAGE_SAFETY_CAP,
  fetchRawCatalogObject,
  listSquareCatalogItems,
} from './catalog.js'
import { clientFromEnv } from './client.js'

const fetchAllCategoryObjects = async client => {
  const categories = []
  let cursor
  let page = 0

  do {
    const query = new URLSearchParams({ types: 'CATEGORY' })
    if (cursor) query.set('cursor', cursor)
    const payload = await client.request(`/v2/catalog/list?${query.toString()}`)
    categories.push(...(payload.objects || []))
    cursor = payload.cursor
    page += 1
  } while (cursor && page < CATALOG_PAGE_SAFETY_CAP)

  return categories
}

export const listSquareCategories = async (env = process.env) => {
  const client = clientFromEnv(env)
  const categories = await fetchAllCategoryObjects(client)

  const byId = new Map(categories.map(category => [category.id, category]))
  const pathOf = id => {
    const parts = []
    let current = id
    let guard = 0
    while (current && guard++ < 10) {
      const category = byId.get(current)
      if (!category) break
      parts.unshift(category.category_data?.name)
      current = category.category_data?.parent_category?.id
    }
    return parts.join(' > ')
  }

  return categories.map(category => ({
    id: category.id,
    name: category.category_data?.name || null,
    path: pathOf(category.id),
  }))
}

// Resolves any category id to its top-level (root) ancestor — used to group
// items into broad sections (game type on the public catalog; category
// groups on the admin stock/mass-inventory/catalog-editor pages) regardless
// of how deep the item's own assigned category sits in a sub-category chain.
// Also exposes a plain id->name lookup (nameOf) for the category itself
// (not its ancestor) — used by getPublicSquareCatalog to label an item's
// immediate/leaf category (its "set") separately from its top-level game type.
export const resolveTopLevelCategoryMap = async (env = process.env) => {
  const client = clientFromEnv(env)
  const categories = await fetchAllCategoryObjects(client)
  const byId = new Map(categories.map(category => [category.id, category]))

  const topOf = id => {
    let current = id
    let top = null
    let guard = 0
    while (current && guard++ < 10) {
      const category = byId.get(current)
      if (!category) break
      top = category
      current = category.category_data?.parent_category?.id
    }
    return top ? { id: top.id, name: top.category_data?.name || null } : null
  }

  const nameOf = id => byId.get(id)?.category_data?.name || null

  return { topOf, nameOf }
}

export const createSquareCategory = async ({ name, parentCategoryId }, env = process.env) => {
  const client = clientFromEnv(env)

  const result = await client.request('/v2/catalog/object', {
    method: 'POST',
    body: {
      idempotency_key: crypto.randomUUID(),
      object: {
        type: 'CATEGORY',
        id: '#new-category',
        category_data: {
          name,
          ...(parentCategoryId
            ? { parent_category: { type: 'CATEGORY', id: parentCategoryId } }
            : {}),
        },
      },
    },
  })

  const created = result.catalog_object
  return {
    id: created.id,
    name: created.category_data?.name || null,
    path: parentCategoryId ? undefined : created.category_data?.name || null,
  }
}

// ─── Category tree management ────────────────────────────────────────────────
// Rename/reparent are simple single-object upserts; delete refuses outright
// (no Square call at all) if anything still references the category, forcing
// an explicit merge/reassign first rather than silently orphaning items or
// leaving child categories under a deleted parent.

export const renameSquareCategory = async (categoryId, name, env = process.env) => {
  const client = clientFromEnv(env)
  const current = await fetchRawCatalogObject(client, categoryId)
  const object = current.object
  object.category_data = { ...(object.category_data || {}), name }

  const result = await client.request('/v2/catalog/object', {
    method: 'POST',
    body: { idempotency_key: crypto.randomUUID(), object },
  })
  return result.catalog_object
}

// parentCategoryId: null promotes the category to top-level (removes parent_category).
export const reparentSquareCategory = async (categoryId, parentCategoryId, env = process.env) => {
  const client = clientFromEnv(env)
  const current = await fetchRawCatalogObject(client, categoryId)
  const object = current.object
  const categoryData = { ...(object.category_data || {}) }
  if (parentCategoryId) {
    categoryData.parent_category = { type: 'CATEGORY', id: parentCategoryId }
  } else {
    delete categoryData.parent_category
  }
  object.category_data = categoryData

  const result = await client.request('/v2/catalog/object', {
    method: 'POST',
    body: { idempotency_key: crypto.randomUUID(), object },
  })
  return result.catalog_object
}

// Refuses outright (throws before making any Square call) if the category is
// still referenced by any item, or still has child categories under it —
// same defensive style as deleteSquareCatalogVariation's "keep >=1 variation"
// guard. Callers must merge/reassign items and reparent children first.
export const deleteSquareCategory = async (categoryId, env = process.env) => {
  const client = clientFromEnv(env)
  const [variations, allCategories] = await Promise.all([
    listSquareCatalogItems(env),
    fetchAllCategoryObjects(client),
  ])

  const referencingItemCount = new Set(
    variations
      .filter(variation => variation.categoryIds.includes(categoryId))
      .map(variation => variation.itemId)
  ).size
  if (referencingItemCount > 0) {
    throw new AppError(
      409,
      `Cannot delete — ${referencingItemCount} item(s) still use this category. Merge it into another category first.`
    )
  }

  const childCategoryCount = allCategories.filter(
    category => category.category_data?.parent_category?.id === categoryId
  ).length
  if (childCategoryCount > 0) {
    throw new AppError(
      409,
      `Cannot delete — ${childCategoryCount} sub-category(ies) still live under this category. Re-parent or delete them first.`
    )
  }

  return client.request(`/v2/catalog/object/${categoryId}`, { method: 'DELETE' })
}

// Reassigns every item currently referencing fromCategoryId over to
// toCategoryId (batch-retrieve -> mutate categories/reporting_category,
// reusing the same sync rule as updateSquareCatalogItem -> batch-upsert),
// then deletes the now-empty fromCategoryId. If fromCategoryId still has
// child categories underneath it, the trailing delete call throws the same
// guard error as deleteSquareCategory — merge only reassigns items, it
// doesn't restructure the category tree itself.
export const mergeSquareCategories = async (fromCategoryId, toCategoryId, env = process.env) => {
  if (fromCategoryId === toCategoryId) {
    throw new Error('Cannot merge a category into itself')
  }

  const variations = await listSquareCatalogItems(env)
  const affectedItemIds = [
    ...new Set(
      variations
        .filter(variation => variation.categoryIds.includes(fromCategoryId))
        .map(variation => variation.itemId)
    ),
  ]

  if (affectedItemIds.length > 0) {
    const { objectsById } = await batchRetrieveSquareCatalogObjects(affectedItemIds, {}, env)
    const mutated = [...objectsById.values()].map(object => {
      const itemData = object.item_data || {}
      const existingIds = (itemData.categories || []).map(category => category.id)
      const nextIds = [
        ...new Set(existingIds.map(id => (id === fromCategoryId ? toCategoryId : id))),
      ]
      itemData.categories = nextIds.map(id => ({ id }))
      if (itemData.reporting_category?.id === fromCategoryId) {
        itemData.reporting_category = { id: toCategoryId }
      }
      object.item_data = itemData
      return object
    })
    await batchUpsertSquareCatalogObjects(mutated, env)
  }

  await deleteSquareCategory(fromCategoryId, env)
  return { mergedItemCount: affectedItemIds.length }
}
