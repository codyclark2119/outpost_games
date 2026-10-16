import crypto from 'node:crypto'
import { buildHiddenFromWebAttributeValues, buildReleasedAtAttributeValues } from './attributes.js'
import { clientFromEnv } from './client.js'

// Square's confirmed real limits for these three batch endpoints (developer.squareup.com).
const CATALOG_UPSERT_BATCH_SIZE = 1000

// objects per batch; Square also caps at 10,000 objects/request total
const CATALOG_DELETE_BATCH_SIZE = 200

// object_ids per /v2/catalog/batch-delete call
const CATALOG_RETRIEVE_BATCH_SIZE = 1000

// ─── Batch catalog primitives ────────────────────────────────────────────────
// Every bulk feature (bulk delete/category/visibility, category merge) is
// built by composing these three — none of them, or their callers, touch the
// single-object /v2/catalog/object endpoint. Proven against this exact Square
// account already by api/scripts/sync-sandbox-catalog.js (which calls the
// same two Square endpoints directly); these are the same primitives wired
// properly into the square/ client so the admin app can use them too.

// Returns a Map<id, rawObject> for every requested id, chunked at Square's
// 1000-id limit per call. `relatedObjectsById` is only populated when
// includeRelatedObjects is true (costs an extra round of data per chunk).
export const batchRetrieveSquareCatalogObjects = async (
  objectIds,
  { includeRelatedObjects = false } = {},
  env = process.env
) => {
  const client = clientFromEnv(env)
  const objectsById = new Map()
  const relatedObjectsById = new Map()

  for (let i = 0; i < objectIds.length; i += CATALOG_RETRIEVE_BATCH_SIZE) {
    const chunk = objectIds.slice(i, i + CATALOG_RETRIEVE_BATCH_SIZE)
    const payload = await client.request('/v2/catalog/batch-retrieve', {
      method: 'POST',
      body: { object_ids: chunk, include_related_objects: includeRelatedObjects },
    })
    for (const object of payload.objects || []) objectsById.set(object.id, object)
    for (const related of payload.related_objects || []) relatedObjectsById.set(related.id, related)
  }

  return { objectsById, relatedObjectsById }
}

// Upserts already-mutated raw catalog objects (as returned by
// batchRetrieveSquareCatalogObjects and then modified in place), chunked at
// Square's 1000-objects-per-batch / 10000-per-request limits. One
// idempotency_key per chunk. id_mappings (temp id -> real id, relevant if a
// chunk creates brand-new sub-objects) are merged across chunks.
export const batchUpsertSquareCatalogObjects = async (objects, env = process.env) => {
  const client = clientFromEnv(env)
  const resultObjects = []
  const idMappings = new Map()

  for (let i = 0; i < objects.length; i += CATALOG_UPSERT_BATCH_SIZE) {
    const chunk = objects.slice(i, i + CATALOG_UPSERT_BATCH_SIZE)
    const payload = await client.request('/v2/catalog/batch-upsert', {
      method: 'POST',
      body: {
        idempotency_key: crypto.randomUUID(),
        batches: [{ objects: chunk }],
      },
    })
    resultObjects.push(...(payload.objects || []))
    for (const mapping of payload.id_mappings || []) {
      idMappings.set(mapping.client_object_id, mapping.object_id)
    }
  }

  return { objects: resultObjects, idMappings }
}

// Deletes many catalog objects (chunked at Square's 200-ids-per-call limit).
// Square allows partial success per call — accumulates whatever actually got
// deleted across every chunk rather than throwing on the first partial miss.
export const batchDeleteSquareCatalogObjects = async (objectIds, env = process.env) => {
  const client = clientFromEnv(env)
  const deletedIds = []

  for (let i = 0; i < objectIds.length; i += CATALOG_DELETE_BATCH_SIZE) {
    const chunk = objectIds.slice(i, i + CATALOG_DELETE_BATCH_SIZE)
    const payload = await client.request('/v2/catalog/batch-delete', {
      method: 'POST',
      body: { object_ids: chunk },
    })
    deletedIds.push(...(payload.deleted_object_ids || []))
  }

  return { deletedIds }
}

// ─── Bulk item actions (admin multi-select) ──────────────────────────────────
// AdminSquareCatalog.vue's list is one row per VARIATION (from
// getSquareInventoryReport), so a multi-variation item shows as multiple rows
// sharing one itemId — selection there is keyed by itemId, meaning these
// three functions always operate on whole ITEMs, never individual variations.

export const deleteSquareCatalogItemsBatch = async (itemIds, env = process.env) =>
  batchDeleteSquareCatalogObjects(itemIds, env)

// categoryId: null clears categorization entirely (removes categories +
// reporting_category). Otherwise replaces whatever categories each item had
// with just this one — distinct from mergeSquareCategories, which moves
// *everything* out of one category; this moves an admin-picked subset into
// exactly one target category.
export const setSquareCatalogItemsCategoryBatch = async (
  itemIds,
  categoryId,
  env = process.env
) => {
  const { objectsById } = await batchRetrieveSquareCatalogObjects(itemIds, {}, env)
  const mutated = [...objectsById.values()].map(object => {
    const itemData = object.item_data || {}
    itemData.categories = categoryId ? [{ id: categoryId }] : []
    if (categoryId) itemData.reporting_category = { id: categoryId }
    else delete itemData.reporting_category
    object.item_data = itemData
    return object
  })
  return batchUpsertSquareCatalogObjects(mutated, env)
}

// hiddenFromWeb is item-level (this site's own outpost_hide_from_web custom
// attribute — see the comment above HIDE_FROM_WEB_ATTRIBUTE_KEY); sellable is
// per-variation, so setting it here cascades to EVERY variation within each
// fetched item. Either field can be set independently of the other.
export const setSquareCatalogItemsVisibilityBatch = async (
  itemIds,
  { hiddenFromWeb, sellable },
  env = process.env
) => {
  const { objectsById } = await batchRetrieveSquareCatalogObjects(itemIds, {}, env)
  const mutated = [...objectsById.values()].map(object => {
    if (hiddenFromWeb !== undefined) {
      object.custom_attribute_values = buildHiddenFromWebAttributeValues(
        object.custom_attribute_values,
        hiddenFromWeb
      )
    }
    const itemData = object.item_data || {}
    if (sellable !== undefined) {
      itemData.variations = (itemData.variations || []).map(variation => {
        variation.item_variation_data = { ...(variation.item_variation_data || {}), sellable }
        return variation
      })
    }
    object.item_data = itemData
    return object
  })
  return batchUpsertSquareCatalogObjects(mutated, env)
}

// releasedAt: null clears it (falls back to itemCreatedAt again) for every
// selected item — item-level only, no per-variation cascade needed (a
// product's release date is one decision for the whole item, same scoping as
// hiddenFromWeb). Lets staff correct a whole shipment/batch at once instead of
// opening each item individually.
export const setSquareCatalogItemsReleasedAtBatch = async (
  itemIds,
  releasedAt,
  env = process.env
) => {
  const { objectsById } = await batchRetrieveSquareCatalogObjects(itemIds, {}, env)
  const mutated = [...objectsById.values()].map(object => {
    object.custom_attribute_values = buildReleasedAtAttributeValues(
      object.custom_attribute_values,
      releasedAt
    )
    return object
  })
  return batchUpsertSquareCatalogObjects(mutated, env)
}
