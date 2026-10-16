import '../loadEnv.js'

// Credentials, sandbox vs production, and the one HTTP client every other
// file in square/ goes through (via clientFromEnv).
const SANDBOX_BASE_URL = 'https://connect.squareupsandbox.com'
const PRODUCTION_BASE_URL = 'https://connect.squareup.com'

const PLACEHOLDER_VALUES = new Set([
  'YOUR_LOCATION_ID',
  'YOUR_ACCESS_TOKEN',
  'YOUR_APPLICATION_ID',
  'YOUR_APP_ID',
  'YOUR_TOKEN',
])

const normalizeEnvValue = value => {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (PLACEHOLDER_VALUES.has(trimmed.toUpperCase()) || /^YOUR_/i.test(trimmed)) {
    return ''
  }
  return trimmed
}

export const resolveSquareEnvironment = (env = process.env) => {
  const value = (env.SQUARE_ENV || '').toLowerCase().trim()
  if (value === 'production' || value === 'prod' || value === 'productions') return 'production'
  return 'sandbox'
}

export const buildSquareApiUrl = (path, environment = resolveSquareEnvironment()) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const baseUrl = environment === 'production' ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL
  return `${baseUrl}${normalizedPath}`
}

// SQUARE_ENV picks which pair of credentials is actually valid — a production
// access token is rejected outright by the sandbox host and vice versa — so
// every credential lookup must go through here rather than reading
// SQUARE_ACCESS_TOKEN/SQUARE_APPLICATION_ID/SQUARE_LOCATION_ID directly.
export const resolveSquareCredentials = (env = process.env) => {
  const environment = resolveSquareEnvironment(env)
  const isProduction = environment === 'production'

  return {
    environment,
    accessToken: normalizeEnvValue(
      isProduction ? env.SQUARE_ACCESS_TOKEN : env.SQUARE_SANDBOX_ACCESS_TOKEN
    ),
    applicationId:
      normalizeEnvValue(
        isProduction ? env.SQUARE_APPLICATION_ID : env.SQUARE_SANDBOX_APPLICATION_ID
      ) || null,
    locationId:
      normalizeEnvValue(
        isProduction
          ? env.SQUARE_LOCATION_ID
          : env.SQUARE_SANDBOX_LOCATION_ID || env.SQUARE_LOCATION_ID
      ) || null,
  }
}

export const createSquarePosClient = ({
  accessToken,
  environment,
  applicationId,
  locationId,
} = {}) => {
  const envOverride = environment ? { ...process.env, SQUARE_ENV: environment } : process.env
  const fallback = resolveSquareCredentials(envOverride)

  const token = normalizeEnvValue(accessToken) || fallback.accessToken
  if (!token) {
    throw new Error('Square access token is required')
  }

  const resolvedEnvironment = fallback.environment

  return {
    environment: resolvedEnvironment,
    baseUrl: resolvedEnvironment === 'production' ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    applicationId: normalizeEnvValue(applicationId) || fallback.applicationId,
    locationId: normalizeEnvValue(locationId) || fallback.locationId,
    async request(path, { method = 'GET', body } = {}) {
      const url = buildSquareApiUrl(path, resolvedEnvironment)
      const response = await fetch(url, {
        method,
        headers: this.headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        const error = new Error(
          payload.message ||
            payload.errors?.[0]?.detail ||
            `Square request failed with ${response.status}`
        )
        error.status = response.status
        error.squareErrors = payload.errors || []
        throw error
      }

      return payload
    },
  }
}

export class SquareVersionMismatchError extends Error {
  constructor(itemId) {
    super(`Square catalog object ${itemId} was modified elsewhere — refresh and try again`)
    this.name = 'SquareVersionMismatchError'
    this.itemId = itemId
  }
}

export const isVersionMismatch = error =>
  (error.squareErrors || []).some(e => e.code === 'VERSION_MISMATCH')

// Every exported function below builds its client through here so credential
// resolution always follows SQUARE_ENV via resolveSquareCredentials.
export const clientFromEnv = (env = process.env) => {
  return createSquarePosClient(resolveSquareCredentials(env))
}

export const getSquareConfigurationStatus = (env = process.env) => {
  const { environment, accessToken, applicationId, locationId } = resolveSquareCredentials(env)
  const envPrefix = environment === 'production' ? 'SQUARE_' : 'SQUARE_SANDBOX_'

  return {
    configured: Boolean(accessToken && applicationId),
    environment,
    hasAccessToken: Boolean(accessToken),
    hasApplicationId: Boolean(applicationId),
    hasLocationId: Boolean(locationId),
    readyForValidation: Boolean(accessToken && applicationId),
    missingFields: [
      !accessToken ? `${envPrefix}ACCESS_TOKEN` : null,
      !applicationId ? `${envPrefix}APPLICATION_ID` : null,
      !locationId ? `${envPrefix}LOCATION_ID` : null,
    ].filter(Boolean),
  }
}
