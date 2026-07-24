// The manual product catalog (outpost:products) is retired in favor of the
// shop's real Square inventory, but that catalog isn't clean enough yet
// (unresolved negative counts, unassigned categories, draft-only imports) to
// power public product displays. Flip this back to true once it is — the
// full catalog/carousel/filter UI in Products.vue and ProductsGameType.vue
// is preserved behind this flag, not removed, so re-enabling is a one-line change.
export const PRODUCTS_CATALOG_LIVE = false
