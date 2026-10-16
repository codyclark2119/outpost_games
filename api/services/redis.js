import { createClient } from 'redis'
import { requiresPersistence } from './persistence.js'

// The API's one Redis connection. Every Redis-backed module receives the same
// `store` object ({ redisClient, isRedisConnected, persistent }) instead of
// wiring its own client. `persistent` is true in production, where a missing
// Redis is an outage (503) rather than a quiet fallback to process memory.
export function createRedisStore(url) {
  let connected = false
  const redisClient = createClient({
    url,
    socket: {
      tls: url.includes('upstash.io'),
      reconnectStrategy: retries => {
        if (retries > 10) {
          console.log('Too many attempts to reconnect to Redis, giving up')
          return new Error('Too many retries')
        }
        return retries * 100
      },
    },
  })
  redisClient.on('error', err => {
    console.error('Redis Client Error:', err.message)
    if (!redisClient.isReady) connected = false
  })
  redisClient.on('ready', () => (connected = true))
  redisClient.on('end', () => (connected = false))
  redisClient.on('connect', () => console.log('✅ Connected to Redis'))
  redisClient.on('reconnecting', () => console.log('🔄 Reconnecting to Redis...'))

  const persistent = requiresPersistence()
  return {
    redisClient,
    isRedisConnected: () => connected,
    persistent,
    // Never throws: a failed connect leaves the store on its memory fallback.
    async connect() {
      try {
        await redisClient.connect()
        connected = true
      } catch (err) {
        console.warn(
          persistent
            ? '⚠️  Redis unavailable: production persistence is degraded:'
            : '⚠️  Redis unavailable: development memory fallback is active:',
          err.message
        )
      }
    },
    async close() {
      if (redisClient.isOpen) await redisClient.quit().catch(console.error)
    },
  }
}
