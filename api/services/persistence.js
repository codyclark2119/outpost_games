import { AppError } from '../middleware/errorHandler.js'
export const requiresPersistence = (env = process.env) =>
  Boolean(env.FLY_APP_NAME) || env.NODE_ENV === 'production'
export const unavailable = cause =>
  new AppError(503, 'Persistence temporarily unavailable', { cause })
export function assertPersistence({ isRedisConnected, persistent }) {
  if (persistent && !isRedisConnected()) throw unavailable()
}

// One string value in Redis with a process-memory fallback. `required` values
// (the default) follow the same rule as collections: without Redis in
// production, reads and writes fail with 503. A cache passes required: false,
// so a Redis hiccup only costs freshness and never an error.
export function createValue(store, key, { required = true } = {}) {
  const { redisClient, isRedisConnected } = store
  let memory = null
  return {
    async get() {
      if (required) assertPersistence(store)
      if (!isRedisConnected()) return memory
      try {
        return (await redisClient.get(key)) ?? memory
      } catch (cause) {
        if (required && store.persistent) throw unavailable(cause)
        return memory
      }
    },
    async set(value) {
      if (required) assertPersistence(store)
      memory = value
      if (!isRedisConnected()) return
      try {
        await redisClient.set(key, value)
      } catch (cause) {
        if (required) throw unavailable(cause)
        console.warn(`⚠️  Failed to persist ${key} to Redis:`, cause.message)
      }
    },
  }
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
