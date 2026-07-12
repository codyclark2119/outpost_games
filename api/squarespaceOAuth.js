// ─── Squarespace OAuth 2.0 (authorization-code flow) ─────────────────────────
// Needed because this store isn't on a plan that supports Developer API Keys,
// so the read-only Products/Inventory integration in squarespaceClient.js has
// to authenticate via a registered OAuth client instead of a static key.
//
// Flow (per Squarespace's OAuth 2.0 Guide):
//   1. A human (shop owner) opens GET /api/squarespace/oauth/authorize once.
//   2. They grant access on Squarespace's confirmation page.
//   3. Squarespace redirects to GET /api/squarespace/oauth/callback — the
//      exact redirect_uri registered with Squarespace — with a one-time code.
//   4. That code is exchanged here for an access token (30 min) + refresh
//      token (7 days, and it *rotates on every use* — each refresh call
//      returns a new refresh_token that replaces the old one).
//   5. getValidAccessToken() keeps a live access token available indefinitely
//      by refreshing shortly before expiry, for as long as it keeps getting
//      called at least once every 7 days.
//
// Scope is read-only, matching the read-only Products/Inventory usage this
// integration actually needs — never request write scopes here.

import crypto from 'crypto'
import { SquarespaceNotConfiguredError, SquarespaceNotAuthorizedError } from './squarespaceErrors.js'

const AUTHORIZE_URL = 'https://login.squarespace.com/api/1/login/oauth/provider/authorize'
const TOKEN_URL = 'https://login.squarespace.com/api/1/login/oauth/provider/tokens'
const SCOPE = 'website.products.read,website.inventory.read'

const TOKENS_KEY = 'outpost:squarespace:oauth:tokens'
// Refresh this many ms before actual expiry — matches the buffer Squarespace's
// own OAuth guide suggests (access_token_expires_at - now > 10s).
const EXPIRY_BUFFER_MS = 10_000

const getClientId = () => process.env.SQUARESPACE_CLIENT_ID
const getClientSecret = () => process.env.SQUARESPACE_CLIENT_SECRET
const getRedirectUri = () => process.env.SQUARESPACE_REDIRECT_URI
const getUserAgent = () => process.env.SQUARESPACE_USER_AGENT || 'TheOutpostGames-Website/1.0'

export const isOAuthConfigured = () =>
  Boolean(getClientId() && getClientSecret() && getRedirectUri())

// Injected from server.js — same Redis-with-memory-fallback convention as
// squarespaceCache.js (a getter, not a frozen boolean, since Redis connects
// asynchronously after this module is wired up).
let redisClient = null
let isRedisConnected = () => false

let memoryTokens = null // { accessToken, accessTokenExpiresAt, refreshToken, refreshTokenExpiresAt }

// A single pending CSRF state at a time — this is a human-driven, one-at-a-time
// flow (one shop owner, seconds to complete), not concurrent multi-user login.
let pendingState = null

export const initSquarespaceOAuth = ({ redisClient: client, isRedisConnected: connectedFn }) => {
  redisClient = client
  if (typeof connectedFn === 'function') isRedisConnected = connectedFn
}

const readTokens = async () => {
  if (!isRedisConnected() || !redisClient) return memoryTokens
  try {
    const data = await redisClient.get(TOKENS_KEY)
    return data ? JSON.parse(data) : memoryTokens
  } catch {
    return memoryTokens
  }
}

const writeTokens = async tokens => {
  memoryTokens = tokens // write-through mirror, same pattern as squarespaceCache.js
  if (!isRedisConnected() || !redisClient) return
  try {
    await redisClient.set(TOKENS_KEY, JSON.stringify(tokens))
  } catch (err) {
    console.warn('⚠️  Failed to persist Squarespace OAuth tokens to Redis:', err.message)
  }
}

// Builds the one-time /authorize URL. Deliberately omits website_id — that
// parameter is only passed back when a flow is launched from an Initiate URL
// inside Squarespace's own UI, which doesn't apply here (this is a private,
// non-partner-listed integration); the user picks their site on Squarespace's
// own confirmation page instead.
export const getAuthorizeUrl = () => {
  if (!isOAuthConfigured()) throw new SquarespaceNotConfiguredError()

  pendingState = crypto.randomBytes(24).toString('hex')

  const url = new URL(AUTHORIZE_URL)
  url.searchParams.set('client_id', getClientId())
  url.searchParams.set('redirect_uri', getRedirectUri())
  url.searchParams.set('scope', SCOPE)
  url.searchParams.set('state', pendingState)
  url.searchParams.set('access_type', 'offline') // required to receive a refresh_token
  return url.toString()
}

// access_token_expires_at / refresh_token_expires_at arrive as fractional-second
// unix-epoch strings (e.g. "1553532363.542") — convert to epoch ms for Date.now() math.
const parseTokenResponse = json => ({
  accessToken: json.access_token,
  accessTokenExpiresAt: parseFloat(json.access_token_expires_at) * 1000,
  refreshToken: json.refresh_token ?? null,
  refreshTokenExpiresAt: json.refresh_token_expires_at
    ? parseFloat(json.refresh_token_expires_at) * 1000
    : null,
})

const postTokenRequest = async body => {
  const basicAuth = Buffer.from(`${getClientId()}:${getClientSecret()}`).toString('base64')
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
      // Required — Squarespace returns error SEC-43 if this header is missing.
      'User-Agent': getUserAgent(),
    },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`Squarespace token request failed: ${res.status} ${JSON.stringify(json)}`)
  }
  return json
}

// Step 4, first exchange: trade the one-time `code` from the callback for
// tokens. The code is valid for 2 minutes and one-time use only.
export const exchangeCodeForTokens = async code => {
  if (!isOAuthConfigured()) throw new SquarespaceNotConfiguredError()
  const json = await postTokenRequest({
    grant_type: 'authorization_code',
    code,
    redirect_uri: getRedirectUri(),
  })
  const tokens = parseTokenResponse(json)
  await writeTokens(tokens)
  return tokens
}

// Refresh tokens rotate on every use: the response's refresh_token REPLACES
// the one that was sent, and the old one is invalidated as soon as the new
// access token is used. Both new values must be persisted, not just the
// access token, or the next refresh will fail with an invalidated token.
const refreshTokens = async currentRefreshToken => {
  const json = await postTokenRequest({
    grant_type: 'refresh_token',
    refresh_token: currentRefreshToken,
  })
  const tokens = parseTokenResponse(json)
  if (!tokens.refreshToken) {
    // Defensive fallback — the docs don't describe this happening, but if a
    // refresh response ever omitted refresh_token, keep the working one
    // rather than losing long-term access.
    const previous = await readTokens()
    tokens.refreshToken = currentRefreshToken
    tokens.refreshTokenExpiresAt = previous?.refreshTokenExpiresAt ?? null
  }
  await writeTokens(tokens)
  return tokens
}

// Returns a live access token, refreshing first if it's expired or about to
// expire. Throws SquarespaceNotConfiguredError if OAuth env vars aren't set,
// or SquarespaceNotAuthorizedError if the one-time human step hasn't happened
// yet (or the refresh token has died and it needs to happen again).
export const getValidAccessToken = async () => {
  if (!isOAuthConfigured()) throw new SquarespaceNotConfiguredError()

  const tokens = await readTokens()
  if (!tokens?.accessToken) {
    throw new SquarespaceNotAuthorizedError()
  }

  if (tokens.accessTokenExpiresAt - Date.now() > EXPIRY_BUFFER_MS) {
    return tokens.accessToken
  }

  if (!tokens.refreshToken) {
    throw new SquarespaceNotAuthorizedError(
      'Squarespace access token expired and no refresh token is available — visit /api/squarespace/oauth/authorize again'
    )
  }

  try {
    const refreshed = await refreshTokens(tokens.refreshToken)
    return refreshed.accessToken
  } catch (err) {
    // Most likely cause: the refresh token expired (7 days unused) or was
    // revoked from Squarespace's UI. Either way a human has to reauthorize.
    throw new SquarespaceNotAuthorizedError(
      `Squarespace re-authorization required (refresh failed: ${err.message})`
    )
  }
}

// Called from the GET /api/squarespace/oauth/callback route after Squarespace
// redirects back with ?code&state (Allow) or ?error=access_denied (Deny).
export const handleOAuthCallback = async ({ code, state, error }) => {
  // `error` is an untrusted query param (this route is public) — log it
  // server-side for debugging but never echo it verbatim into a thrown
  // message that could end up in an HTTP response.
  if (error) {
    console.warn('Squarespace OAuth callback reported an error param:', error)
    throw new Error('Squarespace authorization was denied or failed.')
  }
  if (!state || state !== pendingState) {
    throw new Error(
      'State mismatch — possible CSRF, or the authorize flow expired. Please try again.'
    )
  }
  pendingState = null
  if (!code) throw new Error('Missing authorization code from Squarespace redirect.')
  return exchangeCodeForTokens(code)
}

export const getOAuthStatus = async () => {
  const tokens = await readTokens()
  return {
    configured: isOAuthConfigured(),
    authorized: Boolean(tokens?.accessToken),
    accessTokenExpiresAt: tokens?.accessTokenExpiresAt
      ? new Date(tokens.accessTokenExpiresAt).toISOString()
      : null,
    refreshTokenExpiresAt: tokens?.refreshTokenExpiresAt
      ? new Date(tokens.refreshTokenExpiresAt).toISOString()
      : null,
  }
}
