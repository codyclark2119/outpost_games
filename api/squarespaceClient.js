// ─── Squarespace Commerce API client (read-only) ─────────────────────────────
// Low-level HTTP layer only: paginated GETs against the List Products (v2) and
// List Inventory (1.0) endpoints. No write calls are ever made — access is
// read-only (scopes: website.products.read, website.inventory.read).
//
// Auth is sourced from either a static Developer API Key (SQUARESPACE_API_KEY,
// only available on Squarespace's Commerce Advanced plan) or, when that isn't
// set, an OAuth access token from squarespaceOAuth.js (refreshed as needed).
// Squarespace's Commerce APIs accept a Bearer token from either source
// identically — they only differ in how the token is obtained.
//
// Uses native fetch / AbortController (Node 18+); no HTTP-client dependency.

import { SquarespaceNotConfiguredError, SquarespaceNotAuthorizedError } from './squarespaceErrors.js'
import { isOAuthConfigured, getValidAccessToken } from './squarespaceOAuth.js'

// NOTE: Products and Inventory live on DIFFERENT API version prefixes.
const PRODUCTS_URL = 'https://api.squarespace.com/v2/commerce/products'
const INVENTORY_URL = 'https://api.squarespace.com/1.0/commerce/inventory'

const REQUEST_TIMEOUT_MS = 10000 // per-request AbortController timeout
const MAX_RETRIES = 3 // total attempts per request
const RETRY_BASE_MS = 500 // exponential backoff base (500ms, then 1000ms, ...)
const MAX_PAGES = 200 // hard cap so a broken hasNextPage can't loop forever
const RETRYABLE_STATUS = new Set([429, 502, 503, 504])

const getStaticApiKey = () => process.env.SQUARESPACE_API_KEY
// Squarespace requires a descriptive User-Agent on Commerce API calls; default to
// one identifying this app so a missing SQUARESPACE_USER_AGENT can't cause rejections.
const getUserAgent = () => process.env.SQUARESPACE_USER_AGENT || 'TheOutpostGames-Website/1.0'

export const isConfigured = () => Boolean(getStaticApiKey()) || isOAuthConfigured()

// Resolves the Bearer token for a request: the static key if the site has one
// (simpler, never expires), otherwise a live OAuth access token (auto-refreshed).
// Throws SquarespaceNotConfiguredError / SquarespaceNotAuthorizedError (from
// squarespaceOAuth.js) when neither path is usable yet.
const getAccessToken = async () => {
  const staticKey = getStaticApiKey()
  if (staticKey) return staticKey
  return getValidAccessToken()
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// A single GET attempt with a hard timeout. Resolves to a structured result
// ({ ok, json } | { ok:false, status, statusText, bodyText }); throws on
// network failure / timeout (which the retry loop treats as retryable).
const attemptRequest = async (url, token) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': getUserAgent(),
        Accept: 'application/json',
      },
      signal: controller.signal,
    })
    if (res.ok) {
      return { ok: true, json: await res.json() }
    }
    const bodyText = await res.text().catch(() => '')
    return { ok: false, status: res.status, statusText: res.statusText, bodyText }
  } finally {
    clearTimeout(timeout)
  }
}

// GET with retry + exponential backoff. Retries only on network/timeout errors
// and 429/502/503/504; any other 4xx/5xx throws immediately. A 401 specifically
// means the token was rejected (expired/revoked) — surfaced as
// SquarespaceNotAuthorizedError so callers know a human needs to reauthorize,
// rather than as a generic failure.
const requestWithRetry = async url => {
  let lastError
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) await sleep(RETRY_BASE_MS * 2 ** (attempt - 1))

    let result
    try {
      // Resolved fresh on every attempt so a token refreshed mid-retry-loop is
      // always picked up rather than reusing a stale one.
      const token = await getAccessToken()
      result = await attemptRequest(url, token)
    } catch (err) {
      // Network failure or timeout/abort — retryable. Auth errors from
      // getAccessToken() (SquarespaceNotConfigured/NotAuthorized) are not.
      if (err instanceof SquarespaceNotConfiguredError || err instanceof SquarespaceNotAuthorizedError) {
        throw err
      }
      lastError =
        err?.name === 'AbortError'
          ? new Error(`Squarespace request timed out after ${REQUEST_TIMEOUT_MS}ms`)
          : err
      continue
    }

    if (result.ok) return result.json

    if (RETRYABLE_STATUS.has(result.status)) {
      lastError = new Error(`Squarespace request failed: ${result.status} ${result.statusText}`)
      continue
    }

    if (result.status === 401) {
      throw new SquarespaceNotAuthorizedError(
        'Squarespace rejected the request as unauthorized (401) — the integration needs to be reauthorized.'
      )
    }

    // Non-retryable upstream error — fail fast with body context.
    const detail = result.bodyText ? ` — ${result.bodyText.slice(0, 300)}` : ''
    throw new Error(`Squarespace request failed: ${result.status} ${result.statusText}${detail}`)
  }

  throw lastError || new Error('Squarespace request failed after retries')
}

// Generic paginated GET: loops on the `cursor` query param, collecting every item
// under `arrayKey` until pagination.hasNextPage is false or the safety cap is hit.
const fetchAllPages = async (baseUrl, arrayKey, extraParams = {}) => {
  const items = []
  let cursor = null
  let pages = 0

  do {
    const url = new URL(baseUrl)
    for (const [key, value] of Object.entries(extraParams)) url.searchParams.set(key, value)
    if (cursor) url.searchParams.set('cursor', cursor)

    const data = await requestWithRetry(url.toString())
    const pageItems = Array.isArray(data?.[arrayKey]) ? data[arrayKey] : []
    items.push(...pageItems)

    const pagination = data?.pagination || {}
    // Only continue when we actually have a cursor — guards against a truthy
    // hasNextPage with a missing nextPageCursor spinning forever.
    cursor =
      pagination.hasNextPage && pagination.nextPageCursor
        ? String(pagination.nextPageCursor)
        : null
    pages++
  } while (cursor && pages < MAX_PAGES)

  if (cursor && pages >= MAX_PAGES) {
    console.warn(
      `⚠️  Squarespace pagination hit the ${MAX_PAGES}-page safety cap for "${arrayKey}" — results may be truncated`
    )
  }

  return items
}

// Full catalog / inventory across all pages, flattened. Independent resources —
// callers should run these two concurrently (Promise.all).
export const listAllProducts = () => fetchAllPages(PRODUCTS_URL, 'products')
export const listAllInventory = () => fetchAllPages(INVENTORY_URL, 'inventory')
