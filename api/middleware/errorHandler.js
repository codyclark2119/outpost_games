export class AppError extends Error {
  constructor(status, message, options) {
    super(message, options)
    this.status = status
  }
}
export const asyncRoute = handler => (req, res, next) =>
  Promise.resolve()
    .then(() => handler(req, res, next))
    .catch(next)

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error)
  const status =
    error instanceof AppError ? error.status : error.type === 'entity.parse.failed' ? 400 : 500
  if (status >= 500) console.error(`${req.method} ${req.path}:`, error)
  res.status(status).json({
    error:
      status === 500
        ? 'Unexpected server error'
        : status === 400 && !(error instanceof AppError)
          ? 'Invalid JSON body'
          : error.message,
    ...(status === 503 ? { retryable: true } : {}),
  })
}

// Upstream authentication failures concern server configuration, not the admin session.
export function dependencyError(error, req, res, message = 'Service temporarily unavailable') {
  if (error instanceof AppError) return errorHandler(error, req, res, () => {})
  const status =
    error.name === 'SquareVersionMismatchError'
      ? 409
      : error.status === 429
        ? 429
        : error.status === 404
          ? 404
          : error.status === 409
            ? 409
            : 503
  const publicMessage =
    status === 409
      ? 'The record changed or conflicts with existing data. Reload and try again.'
      : status === 404
        ? 'Resource not found'
        : status === 429
          ? 'Service is busy. Try again shortly.'
          : message
  return errorHandler(new AppError(status, publicMessage, { cause: error }), req, res, () => {})
}
