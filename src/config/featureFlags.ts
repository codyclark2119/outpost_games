// Toggle for the live, Square-inventory-backed Products page vs. the
// "Coming Soon" placeholder. Controlled by an env var (not a hardcoded
// constant) so it can be flipped per-environment without a code change —
// set VITE_PRODUCTS_PAGE_LIVE=true once the catalog is ready to go public.
export const PRODUCTS_CATALOG_LIVE = import.meta.env.VITE_PRODUCTS_PAGE_LIVE === 'true'

// The TCGPlayer-backed "Featured Single Cards" section on the Products page —
// hidden for now (not env-gated like the flag above, since this isn't an
// environment concern) until there's a real plan for tracking individual
// card listings and their prices consistently between the website and
// Square, given how many there are and how often prices move. Flip to true
// once that's sorted out.
export const SINGLE_CARD_LISTINGS_LIVE = false
