// Toggle for the live, Square-inventory-backed Products page vs. the
// "Coming Soon" placeholder. Controlled by an env var (not a hardcoded
// constant) so it can be flipped per-environment without a code change —
// set VITE_PRODUCTS_PAGE_LIVE=true once the catalog is ready to go public.
export const PRODUCTS_CATALOG_LIVE = import.meta.env.VITE_PRODUCTS_PAGE_LIVE === 'true'
