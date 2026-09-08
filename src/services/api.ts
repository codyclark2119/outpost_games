import { ADMIN_BASE_PATH } from '../config/adminPath'
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
export class ApiError extends Error {
  readonly status: number
  readonly payload: unknown

  constructor(status: number, message: string, payload: unknown = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}
let redirecting = false
let expireSession = () => {}
export const onSessionExpired = (handler: () => void) => {
  expireSession = handler
}
type Options = NonNullable<Parameters<typeof globalThis.fetch>[1]> & {
  skipAuthRedirect?: boolean
}
export async function apiRequest(path: string, options: Options = {}): Promise<Response> {
  const { skipAuthRedirect = false, ...init } = options
  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json')
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
  } catch (e) {
    if (init.signal?.aborted) throw e
    throw new ApiError(0, e instanceof Error ? e.message : 'Network request failed')
  }
  if (response.ok) return response
  const text = await response.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }
  if (!response.ok) {
    if (
      response.status === 401 &&
      !redirecting &&
      !skipAuthRedirect &&
      typeof window !== 'undefined' &&
      window.location.pathname.startsWith(ADMIN_BASE_PATH) &&
      window.location.pathname !== `${ADMIN_BASE_PATH}/login`
    ) {
      redirecting = true
      expireSession()
      const back = `${window.location.pathname}${window.location.search}${window.location.hash}`
      window.location.assign(`${ADMIN_BASE_PATH}/login?redirect=${encodeURIComponent(back)}`)
    }
    if (response.status === 401 && !skipAuthRedirect)
      throw new ApiError(401, 'Your session expired. Please sign in again.', payload)
    const message =
      payload &&
      typeof payload === 'object' &&
      'error' in payload &&
      typeof (payload as { error?: unknown }).error === 'string'
        ? (payload as { error: string }).error
        : `Request failed with HTTP ${response.status}`
    throw new ApiError(response.status, message, payload)
  }
  return response
}

export async function apiFetch<T>(path: string, options: Options = {}): Promise<T> {
  const response = await apiRequest(path, options)
  return response.status === 204 ? (null as T) : ((await response.json()) as T)
}
