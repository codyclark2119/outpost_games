import { AppError } from '../middleware/errorHandler.js'
import crypto from 'node:crypto'
import {
  buildCostAttributeValues,
  buildHiddenFromWebAttributeValues,
  buildReleasedAtAttributeValues,
  readCostCents,
  readHiddenFromWeb,
  readReleasedAt,
} from './attributes.js'
import { listSquareCategories } from './categories.js'
import {
  SquareVersionMismatchError,
  buildSquareApiUrl,
  clientFromEnv,
  isVersionMismatch,
  resolveSquareCredentials,
} from './client.js'
import { listSquareInventory } from './inventory.js'

export const CATALOG_PAGE_SAFETY_CAP = 200

export const listSquareCatalogItems = async (env = process.env) => {
  const client = clientFromEnv(env)

  const variations = []
  const imagesById = new Map()
  let cursor
  let page = 0

  do {
    // IMAGE is requested alongside ITEM in the same paginated call so bulk
    // reads (stock report, public catalog) never need a per-item image fetch.
    const query = new URLSearchParams({ types: 'ITEM,IMAGE' })
    if (cursor) query.set('cursor', cursor)

    const payload = await client.request(`/v2/catalog/list?${query.toString()}`)

    for (const object of payload.objects || []) {
      if (object.type === 'IMAGE') {
        imagesById.set(object.id, object.image_data?.url || null)
        continue
      }

      const itemData = object.item_data
      if (!itemData) continue

      const categoryIds = (itemData.categories || []).map(category => category.id)
      const itemImageId = itemData.image_ids?.[0] || null
      const hiddenFromWeb = readHiddenFromWeb(object)

      for (const variation of itemData.variations || []) {
        const variationData = variation.item_variation_data || {}
        // A variation's own image (e.g. "Foil Enhanced" needing its own photo)
        // takes priority; falling back to the item's shared group photo keeps
        // every variation showing *something* for the common case where only
        // one representative photo exists for the whole item.
        const primaryImageId = variationData.image_ids?.[0] || itemImageId
        variations.push({
          id: variation.id,
          itemId: object.id,
          name: itemData.name || null,
          variationName: variationData.name || null,
          sku: variationData.sku || null,
          // Square shows this as "GTIN" in the Dashboard/POS: the
          // manufacturer barcode, kept separate from the shop's own SKU.
          upc: variationData.upc || null,
          priceCents: variationData.price_money?.amount ?? null,
          currency: variationData.price_money?.currency ?? null,
          trackInventory: Boolean(variationData.track_inventory),
          sellable: variationData.sellable !== false,
          presentAtAllLocations: object.present_at_all_locations || false,
          categoryIds,
          primaryImageId,
          costCents: readCostCents(variation),
          hiddenFromWeb,
          releasedAt: readReleasedAt(object),
          itemCreatedAt: object.created_at || null,
        })
      }
    }

    cursor = payload.cursor
    page += 1
  } while (cursor && page < CATALOG_PAGE_SAFETY_CAP)

  // Resolved as a second pass rather than inline — an item can be paginated
  // before the IMAGE object it references, so imagesById isn't complete
  // until the whole list has been walked.
  for (const variation of variations) {
    variation.imageUrl = variation.primaryImageId
      ? imagesById.get(variation.primaryImageId) || null
      : null
  }

  return variations
}

export const fetchRawCatalogObject = (client, itemId) =>
  client.request(`/v2/catalog/object/${itemId}?include_related_objects=true`)

export const getSquareCatalogItem = async (itemId, env = process.env) => {
  const client = clientFromEnv(env)

  const payload = await fetchRawCatalogObject(client, itemId)
  const object = payload.object
  const itemData = object.item_data || {}
  const rawVariations = itemData.variations || []

  // `include_related_objects` isn't reliably populated (observed empty against
  // sandbox even for a valid, existing category) — resolve names against the
  // full category list instead of trusting it.
  const categoryNames = (itemData.categories || []).length
    ? new Map((await listSquareCategories(env)).map(category => [category.id, category.name]))
    : new Map()

  // `related_objects` usually has the IMAGE objects inline, but not always
  // reliably (see fallback below) — build a lookup for whatever IS there, for
  // both the item's own image and every variation's, resolved together.
  const relatedImagesById = new Map(
    (payload.related_objects || [])
      .filter(related => related.type === 'IMAGE')
      .map(related => [related.id, related.image_data?.url || null])
  )
  const resolveImageUrl = async imageId => {
    if (!imageId) return null
    if (relatedImagesById.has(imageId)) return relatedImagesById.get(imageId)
    const imagePayload = await client.request(`/v2/catalog/object/${imageId}`).catch(() => null)
    return imagePayload?.object?.image_data?.url || null
  }

  const itemImageId = itemData.image_ids?.[0] || null
  const imageUrl = await resolveImageUrl(itemImageId)

  const trackedVariationIds = rawVariations
    .filter(variation => variation.item_variation_data?.track_inventory)
    .map(variation => variation.id)

  let quantityById = new Map()
  if (trackedVariationIds.length) {
    const credentials = resolveSquareCredentials(env)
    if (credentials.locationId) {
      const counts = await listSquareInventory(env, {
        catalogObjectIds: trackedVariationIds,
        locationIds: [credentials.locationId],
      })
      quantityById = new Map(counts.map(count => [count.catalog_object_id, Number(count.quantity)]))
    }
  }

  const variations = await Promise.all(
    rawVariations.map(async variation => {
      const variationData = variation.item_variation_data || {}
      const ownImageId = variationData.image_ids?.[0] || null
      return {
        id: variation.id,
        name: variationData.name || null,
        sku: variationData.sku || null,
        priceCents: variationData.price_money?.amount ?? null,
        currency: variationData.price_money?.currency || 'USD',
        trackInventory: Boolean(variationData.track_inventory),
        sellable: variationData.sellable !== false,
        stockable: variationData.stockable !== false,
        quantity: variationData.track_inventory ? (quantityById.get(variation.id) ?? 0) : null,
        costCents: readCostCents(variation),
        // hasOwnImage distinguishes "this variation has its own photo" from
        // "showing the item's shared group photo as a fallback" — the admin
        // UI uses this to label which one is currently displayed.
        imageUrl: await resolveImageUrl(ownImageId || itemImageId),
        hasOwnImage: Boolean(ownImageId),
      }
    })
  )

  return {
    id: object.id,
    version: object.version,
    name: itemData.name || null,
    description: itemData.description || '',
    hiddenFromWeb: readHiddenFromWeb(object),
    releasedAt: readReleasedAt(object),
    itemCreatedAt: object.created_at || null,
    imageUrl,
    categories: (itemData.categories || []).map(category => ({
      id: category.id,
      name: categoryNames.get(category.id) || null,
    })),
    variations,
  }
}

// Square's catalog upsert replaces the whole object graph for an id, so every
// untouched field (sku, tax_ids, image_ids, reporting_category, ...) must be
// echoed back exactly as fetched — only the allow-listed fields below are changed.
// `changes.variations` is an array of { id, name?, priceCents?, trackInventory?,
// sellable?, stockable?, costCents? } — one entry per variation being edited.
// costCents: null clears the stored unit cost; omitting the field entirely
// leaves it untouched. Variations not referenced in that array (or not
// present in `changes` at all) pass through untouched, same as every other
// field on this object.
export const updateSquareCatalogItem = async (itemId, changes, env = process.env) => {
  const client = clientFromEnv(env)

  const current = await fetchRawCatalogObject(client, itemId)
  const object = current.object
  const itemData = object.item_data || {}
  const variations = itemData.variations || []

  if (changes.name !== undefined) itemData.name = changes.name
  if (changes.description !== undefined) {
    itemData.description = changes.description
    itemData.description_html = changes.description
    itemData.description_plaintext = changes.description
  }
  if (changes.hiddenFromWeb !== undefined) {
    object.custom_attribute_values = buildHiddenFromWebAttributeValues(
      object.custom_attribute_values,
      changes.hiddenFromWeb
    )
  }
  if (changes.releasedAt !== undefined) {
    object.custom_attribute_values = buildReleasedAtAttributeValues(
      object.custom_attribute_values,
      changes.releasedAt
    )
  }
  if (changes.categoryIds !== undefined) {
    itemData.categories = changes.categoryIds.map(id => ({ id }))
    // Square's Dashboard/POS/reports read `reporting_category` (a separate,
    // single-value field) as the item's "real" category — it doesn't follow
    // `categories` automatically, so it has to be kept in sync by hand or a
    // category change silently fails to show up anywhere that reads it.
    if (changes.categoryIds.length > 0) {
      itemData.reporting_category = { id: changes.categoryIds[0] }
    } else {
      delete itemData.reporting_category
    }
  }

  if (changes.variations !== undefined) {
    const changesByVariationId = new Map(
      changes.variations.map(variation => [variation.id, variation])
    )
    for (const variation of variations) {
      const variationChanges = changesByVariationId.get(variation.id)
      if (!variationChanges) continue

      const variationData = variation.item_variation_data || {}
      if (variationChanges.name !== undefined) variationData.name = variationChanges.name
      if (variationChanges.priceCents !== undefined) {
        // Draft items created with no price start as VARIABLE_PRICING (no
        // price_money allowed); setting a price now means it's a fixed price.
        variationData.pricing_type = 'FIXED_PRICING'
        variationData.price_money = {
          amount: variationChanges.priceCents,
          currency: variationData.price_money?.currency || 'USD',
        }
      }
      if (variationChanges.trackInventory !== undefined)
        variationData.track_inventory = variationChanges.trackInventory
      if (variationChanges.sellable !== undefined)
        variationData.sellable = variationChanges.sellable
      if (variationChanges.stockable !== undefined)
        variationData.stockable = variationChanges.stockable
      if (variationChanges.costCents !== undefined) {
        variation.custom_attribute_values = buildCostAttributeValues(
          variation.custom_attribute_values,
          variationChanges.costCents
        )
      }
      variation.item_variation_data = variationData
    }
  }

  itemData.variations = variations
  object.item_data = itemData

  try {
    const result = await client.request('/v2/catalog/object', {
      method: 'POST',
      body: {
        idempotency_key: crypto.randomUUID(),
        object,
      },
    })
    return result.catalog_object
  } catch (error) {
    if (isVersionMismatch(error)) throw new SquareVersionMismatchError(itemId)
    throw error
  }
}

// variations: [{ name, sku, priceCents?, trackInventory?, sellable?, stockable? }]
// A variation without priceCents is created as VARIABLE_PRICING (price set at
// sale time) rather than failing on a missing price — useful for draft items
// staged ahead of a set's release, before the shop has decided resale pricing.
export const createSquareCatalogItem = async (
  { name, description, categoryIds = [], ecomVisibility, variations },
  env = process.env
) => {
  const client = clientFromEnv(env)

  const object = {
    type: 'ITEM',
    id: '#new-item',
    item_data: {
      name,
      description: description || undefined,
      ecom_visibility: ecomVisibility || undefined,
      categories: categoryIds.map(id => ({ id })),
      variations: variations.map((variation, index) => ({
        type: 'ITEM_VARIATION',
        id: `#new-item-var-${index}`,
        item_variation_data: {
          name: variation.name || 'Regular',
          sku: variation.sku || undefined,
          pricing_type: variation.priceCents != null ? 'FIXED_PRICING' : 'VARIABLE_PRICING',
          ...(variation.priceCents != null
            ? { price_money: { amount: variation.priceCents, currency: 'USD' } }
            : {}),
          track_inventory: variation.trackInventory ?? false,
          sellable: variation.sellable ?? true,
          stockable: variation.stockable ?? true,
        },
      })),
    },
  }

  const result = await client.request('/v2/catalog/object', {
    method: 'POST',
    body: { idempotency_key: crypto.randomUUID(), object },
  })
  return result.catalog_object
}

export const deleteSquareCatalogItem = async (itemId, env = process.env) => {
  const client = clientFromEnv(env)
  return client.request(`/v2/catalog/object/${itemId}`, { method: 'DELETE' })
}

// Square requires every item to keep at least one variation — deleting the
// last one has to go through deleteSquareCatalogItem (the whole item) instead.
export const deleteSquareCatalogVariation = async (itemId, variationId, env = process.env) => {
  const client = clientFromEnv(env)

  const current = await fetchRawCatalogObject(client, itemId)
  const variations = current.object.item_data?.variations || []
  if (variations.length <= 1) {
    throw new AppError(
      409,
      'An item must have at least one variation — delete the whole item instead'
    )
  }
  if (!variations.some(variation => variation.id === variationId)) {
    throw new AppError(409, 'That variation does not belong to this item')
  }

  return client.request(`/v2/catalog/object/${variationId}`, { method: 'DELETE' })
}

// Appends a new variation to an existing item (temp id '#new-variation',
// same pattern as createSquareCatalogItem's per-variation temp ids). Unlike
// updateSquareCatalogItem's PUT path — which locks SKU editing on *existing*
// variations to protect already-scanned in-store barcodes — an initial `sku`
// IS accepted here: a brand-new variation has no barcode yet, so there's
// nothing to protect. Once created, it becomes SKU-locked like every other
// variation via the existing edit route's guard.
export const addSquareCatalogVariation = async (
  itemId,
  { name, sku, priceCents, trackInventory, sellable, stockable },
  env = process.env
) => {
  const client = clientFromEnv(env)

  const current = await fetchRawCatalogObject(client, itemId)
  const object = current.object
  const itemData = object.item_data || {}
  const variations = itemData.variations || []

  // A new ITEM_VARIATION defaults to "present at all locations" — Square
  // rejects that outright when the parent ITEM isn't also present at all
  // locations (confirmed live: "is enabled at all future locations, but the
  // referenced object... is not"). Copy the parent's own location scoping so
  // the new variation always matches it instead of Square's default.
  variations.push({
    type: 'ITEM_VARIATION',
    id: '#new-variation',
    present_at_all_locations: object.present_at_all_locations || false,
    ...(object.present_at_all_locations
      ? {}
      : { present_at_location_ids: object.present_at_location_ids || [] }),
    item_variation_data: {
      item_id: itemId,
      name: name || 'Regular',
      sku: sku || undefined,
      pricing_type: priceCents != null ? 'FIXED_PRICING' : 'VARIABLE_PRICING',
      ...(priceCents != null ? { price_money: { amount: priceCents, currency: 'USD' } } : {}),
      track_inventory: trackInventory ?? false,
      sellable: sellable ?? true,
      stockable: stockable ?? true,
    },
  })
  itemData.variations = variations
  object.item_data = itemData

  const result = await client.request('/v2/catalog/object', {
    method: 'POST',
    body: { idempotency_key: crypto.randomUUID(), object },
  })
  return result.catalog_object
}

// objectId can be either an ITEM id (sets the item's shared/group photo) or
// an ITEM_VARIATION id (sets that one variation's own photo) — Square's
// CreateCatalogImage endpoint accepts either interchangeably, confirmed
// against the official docs (developer.squareup.com/docs/catalog-api/upload-and-attach-images).
export const uploadSquareCatalogImage = async (
  objectId,
  { buffer, filename, mimeType },
  env = process.env
) => {
  const credentials = resolveSquareCredentials(env)
  if (!credentials.accessToken) {
    throw new Error('Square access token is required')
  }

  const formData = new FormData()
  formData.append(
    'request',
    JSON.stringify({
      idempotency_key: crypto.randomUUID(),
      object_id: objectId,
      image: { id: '#new-image', type: 'IMAGE', image_data: {} },
    })
  )
  formData.append('file', new Blob([buffer], { type: mimeType }), filename)

  const response = await fetch(buildSquareApiUrl('/v2/catalog/images', credentials.environment), {
    method: 'POST',
    headers: { Authorization: `Bearer ${credentials.accessToken}` },
    body: formData,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(
      payload.message ||
        payload.errors?.[0]?.detail ||
        `Square image upload failed with ${response.status}`
    )
    error.status = response.status
    error.squareErrors = payload.errors || []
    throw error
  }

  const newImageId = payload.image?.id
  const imageUrl = payload.image?.image_data?.url || null

  // Square's CreateCatalogImage APPENDS to the target's image_ids rather than
  // replacing/prepending it (confirmed live) — every other read path here
  // treats image_ids[0] as "the" image, so a newly uploaded image silently
  // never displays unless it's moved to the front ourselves. Works the same
  // way whether objectId is an ITEM (item_data) or ITEM_VARIATION
  // (item_variation_data) — pick the matching nested data key.
  if (newImageId) {
    const client = clientFromEnv(env)
    const current = await fetchRawCatalogObject(client, objectId)
    const object = current.object
    const dataKey = object.type === 'ITEM_VARIATION' ? 'item_variation_data' : 'item_data'
    const data = object[dataKey] || {}
    const existingIds = data.image_ids || []

    data.image_ids = [newImageId, ...existingIds.filter(id => id !== newImageId)]
    object[dataKey] = data

    await client.request('/v2/catalog/object', {
      method: 'POST',
      body: { idempotency_key: crypto.randomUUID(), object },
    })
  }

  return { imageUrl }
}

// ─── Barcode linking (mobile admin scanner) ──────────────────────────────────
// A scanned barcode can name the same product in two ways: as the shop's own
// SKU (what the register matches, printed on Square labels) or as the
// manufacturer's UPC/EAN, which Square stores separately as `upc` ("GTIN" in
// the Dashboard, 12-14 digits). UPC-A and EAN-13 are the same code with and
// without a leading 0, and scanners report either, so both spellings match.
export const barcodeVariants = code => {
  const normalized = String(code ?? '')
    .trim()
    .toUpperCase()
  if (!normalized) return []
  const variants = new Set([normalized])
  if (/^0\d{12}$/.test(normalized)) variants.add(normalized.slice(1))
  if (/^\d{12}$/.test(normalized)) variants.add(`0${normalized}`)
  return [...variants]
}

const GTIN_PATTERN = /^\d{12,14}$/

// Attaches a scanned barcode to a variation without ever overwriting a SKU —
// SKUs are locked elsewhere in the admin to protect register scanning, and
// this path honours that: an empty SKU is filled; otherwise a manufacturer
// barcode goes into the separate GTIN field. Anything else is refused with a
// reason the admin can act on. Returns which field was written.
export const linkSquareVariationBarcode = async (variationId, code, env = process.env) => {
  const barcode = String(code ?? '').trim()
  if (!barcode) throw new AppError(400, 'A barcode is required')

  const client = clientFromEnv(env)
  const variations = await listSquareCatalogItems(env)
  const target = variations.find(variation => variation.id === variationId)
  if (!target) throw new AppError(404, 'That product variation no longer exists')

  const variants = new Set(barcodeVariants(barcode))
  const owner = variations.find(
    variation =>
      variation.id !== variationId &&
      [variation.sku, variation.upc].some(value => value && variants.has(value.toUpperCase()))
  )
  if (owner) {
    const ownerName =
      owner.variationName && owner.variationName !== 'Regular'
        ? `${owner.name} - ${owner.variationName}`
        : owner.name
    throw new AppError(409, `That barcode already belongs to "${ownerName}"`)
  }
  if ([target.sku, target.upc].some(value => value && variants.has(value.toUpperCase()))) {
    return { field: target.sku && variants.has(target.sku.toUpperCase()) ? 'sku' : 'upc', barcode }
  }

  let field
  if (!target.sku) field = 'sku'
  else if (GTIN_PATTERN.test(barcode) && !target.upc) field = 'upc'
  else if (GTIN_PATTERN.test(barcode)) {
    throw new AppError(
      409,
      `This product already has SKU ${target.sku} and GTIN ${target.upc} — remove one in Square first`
    )
  } else {
    throw new AppError(
      409,
      `This product already has SKU ${target.sku}, and SKUs are locked to protect register scanning. Only a 12–14 digit manufacturer barcode can be added (as its GTIN).`
    )
  }

  const { object } = await fetchRawCatalogObject(client, variationId)
  object.item_variation_data = { ...(object.item_variation_data || {}), [field]: barcode }
  try {
    await client.request('/v2/catalog/object', {
      method: 'POST',
      body: { idempotency_key: crypto.randomUUID(), object },
    })
  } catch (error) {
    if (isVersionMismatch(error)) throw new SquareVersionMismatchError(target.itemId)
    throw error
  }
  return { field, barcode }
}
