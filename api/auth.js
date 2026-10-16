import { assertPersistence, requiresPersistence, unavailable } from './services/persistence.js'
import { asyncRoute } from './middleware/errorHandler.js'
// ─── Admin session auth ───────────────────────────────────────────────────────
// Opaque server-side sessions (not JWT) so a login can be revoked immediately by
// deleting its Redis key — matters for an admin panel with catalog write access.
// Uses the shared Redis store from services/redis.js (injected via initAuth()),
// with an in-memory fallback outside production.

import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'

const SESSION_PREFIX = 'outpost:session:'
const SESSION_TTL_SECONDS = 12 * 60 * 60 // 12 hours, refreshed on each authenticated request

let store = { redisClient: null, isRedisConnected: () => false, persistent: requiresPersistence() }
const redis = () => (store.isRedisConnected() ? store.redisClient : null)

// In-memory fallback: sessionId -> { username, expiresAt }
const memorySessions = new Map()

export const initAuth = sharedStore => {
  store = { persistent: requiresPersistence(), ...sharedStore }
}

const parseAdminUsers = () => {
  const raw = process.env.ADMIN_USERS
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    console.error('❌ ADMIN_USERS is not valid JSON — no admin logins will succeed')
    return []
  }
}

export const verifyCredentials = async (username, password) => {
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password)
    return false
  const users = parseAdminUsers()
  const user = users.find(u => u.username === username)
  if (!user || !user.passwordHash) return false
  return bcrypt.compare(password, user.passwordHash)
}

export const createSession = async username => {
  assertPersistence(store)
  const sessionId = crypto.randomBytes(32).toString('hex')
  const session = { username, createdAt: Date.now() }
  const client = redis()

  if (client) {
    await client
      .set(SESSION_PREFIX + sessionId, JSON.stringify(session), {
        EX: SESSION_TTL_SECONDS,
      })
      .catch(cause => {
        throw unavailable(cause)
      })
  } else {
    memorySessions.set(sessionId, {
      ...session,
      expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
    })
  }

  return sessionId
}

export const getSession = async sessionId => {
  if (!sessionId) return null
  assertPersistence(store)
  const client = redis()

  if (client) {
    const key = SESSION_PREFIX + sessionId
    const data = await client.get(key)
    if (!data) return null
    await client.expire(key, SESSION_TTL_SECONDS) // sliding expiration
    return JSON.parse(data)
  }

  const session = memorySessions.get(sessionId)
  if (!session) return null
  if (session.expiresAt < Date.now()) {
    memorySessions.delete(sessionId)
    return null
  }
  session.expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000
  return { username: session.username, createdAt: session.createdAt }
}

export const destroySession = async sessionId => {
  if (!sessionId) return
  assertPersistence(store)
  const client = redis()
  if (client) {
    await client.del(SESSION_PREFIX + sessionId).catch(cause => {
      throw unavailable(cause)
    })
  } else {
    memorySessions.delete(sessionId)
  }
}

export const requireAdminAuth = asyncRoute(async (req, res, next) => {
  if (req.admin) return next()
  const sessionId = req.cookies?.sid
  let session
  try {
    session = await getSession(sessionId)
  } catch (cause) {
    throw unavailable(cause)
  }
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  req.admin = session
  next()
})
