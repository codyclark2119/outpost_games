// object_ids per /v2/catalog/batch-retrieve call

// Square's Catalog API has no built-in "cost of goods" field on a variation —
// confirmed against a live account, not just docs (no such field appears on
// item_variation_data). A CatalogCustomAttributeDefinition (type NUMBER,
// scoped to ITEM_VARIATION, name "Unit Cost") was created once for this via
// a direct API call — see README's "Square POS Catalog Admin" section — and
// is referenced here purely by its `key`, which Square resolves to the
// definition automatically on writes (no definition id needed, confirmed
// live: a write with only `key`+`type`+`number_value` round-trips fine).
const COST_ATTRIBUTE_KEY = 'outpost_unit_cost'

// Reads the unit cost off a raw ITEM_VARIATION catalog object (present at the
// object's top level, both from bulk /v2/catalog/list and single-object
// retrieve — confirmed live on this account). Square stores NUMBER custom
// attributes as a string; returns cents (integer) or null if never set.
export const readCostCents = rawVariationObject => {
  const raw = rawVariationObject.custom_attribute_values?.[COST_ATTRIBUTE_KEY]?.number_value
  if (raw == null) return null
  const dollars = Number(raw)
  return Number.isFinite(dollars) ? Math.round(dollars * 100) : null
}

// Builds the custom_attribute_values map to upsert for a given cost — pass
// costCents: null to clear it (an empty map entirely omits the key, which
// Square treats as "not set" the same as it never having been written).
export const buildCostAttributeValues = (existing, costCents) => {
  const next = { ...(existing || {}) }
  if (costCents === null) {
    delete next[COST_ATTRIBUTE_KEY]
  } else {
    next[COST_ATTRIBUTE_KEY] = {
      key: COST_ATTRIBUTE_KEY,
      type: 'NUMBER',
      number_value: (costCents / 100).toFixed(2),
    }
  }
  return next
}

// Square's own `ecom_visibility` field has no effect on this site or the
// physical POS (confirmed live — this account has no online-store channel
// configured, so Square silently normalizes whatever is written back to
// UNAVAILABLE on read) — it can't be used to hide an item from the public
// catalog. `sellable` DOES affect the public catalog, but it also blocks the
// item from being rung up at the in-store register, which is a much bigger
// hammer than "just hide it from the website." This is a second
// CatalogCustomAttributeDefinition (type BOOLEAN, scoped to ITEM, key
// `outpost_hide_from_web`) created once the same way `outpost_unit_cost` was
// (see README's "Square POS Catalog Admin" section) — a durable, independent
// flag purely for this site's own public-catalog filtering.
const HIDE_FROM_WEB_ATTRIBUTE_KEY = 'outpost_hide_from_web'

// Reads the flag off a raw ITEM catalog object (item-level, not per-variation
// — hiding an item from the site is an all-or-nothing decision for the whole
// item, matching how the admin UI's Visibility control already worked).
export const readHiddenFromWeb = rawItemObject =>
  rawItemObject.custom_attribute_values?.[HIDE_FROM_WEB_ATTRIBUTE_KEY]?.boolean_value === true

// hidden: false removes the attribute value entirely rather than writing an
// explicit `false` — same "omitting means not set" convention as cost above.
export const buildHiddenFromWebAttributeValues = (existing, hidden) => {
  const next = { ...(existing || {}) }
  if (!hidden) {
    delete next[HIDE_FROM_WEB_ATTRIBUTE_KEY]
  } else {
    next[HIDE_FROM_WEB_ATTRIBUTE_KEY] = {
      key: HIDE_FROM_WEB_ATTRIBUTE_KEY,
      type: 'BOOLEAN',
      boolean_value: true,
    }
  }
  return next
}

// A third CatalogCustomAttributeDefinition (type STRING — Square has no native
// DATE type; confirmed against the live CatalogCustomAttributeDefinitionType
// enum, which only has STRING/BOOLEAN/NUMBER/SELECTION — created the same way
// as the two above, key `outpost_released_at`, scoped to ITEM). Stores an ISO
// date (YYYY-MM-DD) staff set to mark when a product actually became
// available. This exists because Square's own `created_at` on an ITEM reflects
// whenever that catalog entry was last created/touched in Square — bulk
// imports and catalog cleanups bump it without the product actually being new
// — so it's unreliable as a "newest arrivals" signal on its own. The public
// catalog's default sort (getPublicSquareCatalog, below) uses this value when
// set, falling back to itemCreatedAt when it isn't.
const RELEASED_AT_ATTRIBUTE_KEY = 'outpost_released_at'

export const readReleasedAt = rawItemObject =>
  rawItemObject.custom_attribute_values?.[RELEASED_AT_ATTRIBUTE_KEY]?.string_value || null

// releasedAt: null/'' removes the attribute entirely (falls back to
// itemCreatedAt again), same "omitting means not set" convention as above.
export const buildReleasedAtAttributeValues = (existing, releasedAt) => {
  const next = { ...(existing || {}) }
  if (!releasedAt) {
    delete next[RELEASED_AT_ATTRIBUTE_KEY]
  } else {
    next[RELEASED_AT_ATTRIBUTE_KEY] = {
      key: RELEASED_AT_ATTRIBUTE_KEY,
      type: 'STRING',
      string_value: releasedAt,
    }
  }
  return next
}
