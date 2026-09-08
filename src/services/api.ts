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
type Options = NonNullable<Parameters<typeof globalThis.fetch>[1]> & {
  skipAuthRedirect?: boolean
}
export async function apiFetch<T>(path: string, options: Options = {}): Promise<T> {
  const { skipAuthRedirect = false, ...init } = options
  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json')
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
  } catch (e) {
    throw new ApiError(0, e instanceof Error ? e.message : 'Network request failed')
  }
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
      !skipAuthRedirect &&
      typeof window !== 'undefined' &&
      window.location.pathname.startsWith(ADMIN_BASE_PATH) &&
      window.location.pathname !== `${ADMIN_BASE_PATH}/login`
    ) {
      const back = `${window.location.pathname}${window.location.search}${window.location.hash}`
      window.location.assign(`${ADMIN_BASE_PATH}/login?redirect=${encodeURIComponent(back)}`)
    }
    const message =
      payload &&
      typeof payload === 'object' &&
      'error' in payload &&
      typeof (payload as { error?: unknown }).error === 'string'
        ? (payload as { error: string }).error
        : `Request failed with HTTP ${response.status}`
    throw new ApiError(response.status, message, payload)
  }
  return payload as T
}
