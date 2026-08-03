// The admin section's base path is deliberately configurable rather than a
// fixed, publicly-known string — with the repo public, "/x/outpostAdmin" is
// visible to anyone reading the source, so real deployments should set
// VITE_ADMIN_BASE_PATH to something private instead of relying on the
// default. This is obscurity on top of the real defense (the login wall in
// api/auth.js), not a replacement for it.
const raw = import.meta.env.VITE_ADMIN_BASE_PATH || '/x/outpostAdmin'

// Normalize: exactly one leading slash, no trailing slash, so every route
// built from this (`${ADMIN_BASE_PATH}/events`, etc.) is well-formed
// regardless of how the env var was entered.
const withLeadingSlash = raw.startsWith('/') ? raw : `/${raw}`
export const ADMIN_BASE_PATH =
  withLeadingSlash.length > 1 && withLeadingSlash.endsWith('/')
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash
