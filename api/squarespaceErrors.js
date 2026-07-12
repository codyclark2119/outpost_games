// ─── Shared error types for the Squarespace integration ──────────────────────
// Kept in their own module so squarespaceClient.js, squarespaceOAuth.js,
// squarespaceCache.js, and server.js can all throw/catch the same class
// identities without creating import cycles between them.

// Neither a static SQUARESPACE_API_KEY nor OAuth client_id/secret are set.
export class SquarespaceNotConfiguredError extends Error {
  constructor(message = 'Squarespace API access is not configured') {
    super(message)
    this.name = 'SquarespaceNotConfiguredError'
  }
}

// OAuth is configured (client_id/secret/redirect_uri are set) but the one-time
// human authorization step hasn't happened yet, or the refresh token died
// (expired after 7 days unused, or was revoked) and a human needs to visit
// /api/squarespace/oauth/authorize again.
export class SquarespaceNotAuthorizedError extends Error {
  constructor(
    message = 'Squarespace OAuth has not been authorized yet — visit /api/squarespace/oauth/authorize'
  ) {
    super(message)
    this.name = 'SquarespaceNotAuthorizedError'
  }
}
