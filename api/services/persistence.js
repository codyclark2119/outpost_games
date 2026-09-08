import { AppError } from '../middleware/errorHandler.js'
export const requiresPersistence = (env = process.env) =>
  Boolean(env.FLY_APP_NAME) || env.NODE_ENV === 'production'
export const unavailable = cause =>
  new AppError(503, 'Persistence temporarily unavailable', { cause })
export function assertPersistence(connected, env = process.env) {
  if (requiresPersistence(env) && !connected) throw unavailable()
}
// Serialize read/modify/write within this API process. Redis WATCH protects
// against other instances; a conflict asks the admin to reload, never overwrites.
export function createCollection({ redisClient, isRedisConnected, persistent }, key) {
  let memory = []
  let queue = Promise.resolve()
  const read = async () => {
    if (!isRedisConnected()) {
      if (persistent) throw unavailable()
      return structuredClone(memory)
    }
    try {
      const raw = await redisClient.get(key)
      return raw ? JSON.parse(raw) : []
    } catch (cause) {
      throw unavailable(cause)
    }
  }
  const update = change => {
    const operation = queue.then(async () => {
      if (!isRedisConnected()) {
        if (persistent) throw unavailable()
        const rows = structuredClone(memory)
        const result = change(rows)
        memory = rows
        return result
      }
      try {
        return await redisClient.executeIsolated(async client => {
          await client.watch(key)
          try {
            const raw = await client.get(key)
            const rows = raw ? JSON.parse(raw) : []
            const result = change(rows)
            await client.multi().set(key, JSON.stringify(rows)).exec()
            return result
          } finally {
            await client.unwatch()
          }
        })
      } catch (cause) {
        if (cause instanceof AppError) throw cause
        if (cause.name === 'WatchError')
          throw new AppError(409, 'Data changed. Reload and try again.')
        throw unavailable(cause)
      }
    })
    queue = operation.catch(() => {})
    return operation
  }
  return { read, update }
}
