// ─── Admin session auth ───────────────────────────────────────────────────────
// Opaque server-side sessions (not JWT) so a login can be revoked immediately by
// deleting its Redis key — matters for an admin panel with catalog write access.
// Mirrors the Redis-with-in-memory-fallback convention used by squarespaceCache.js:
// the shared Redis client + a live "connected" flag are injected via initAuth().

import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'

const SESSION_PREFIX = 'outpost:session:'
const SESSION_TTL_SECONDS = 12 * 60 * 60 // 12 hours, refreshed on each authenticated request

let redisClient = null
let isRedisConnected = () => false

// In-memory fallback: sessionId -> { username, expiresAt }
const memorySessions = new Map()

export const initAuth = ({ redisClient: client, isRedisConnected: connectedFn }) => {
  redisClient = client
  if (typeof connectedFn === 'function') isRedisConnected = connectedFn
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
  if (!username || !password) return false
  const users = parseAdminUsers()
  const user = users.find(u => u.username === username)
  if (!user || !user.passwordHash) return false
  return bcrypt.compare(password, user.passwordHash)
}

export const createSession = async username => {
  const sessionId = crypto.randomBytes(32).toString('hex')
  const session = { username, createdAt: Date.now() }

  if (isRedisConnected() && redisClient) {
    await redisClient.set(SESSION_PREFIX + sessionId, JSON.stringify(session), { EX: SESSION_TTL_SECONDS })
  } else {
    memorySessions.set(sessionId, { ...session, expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000 })
  }

  return sessionId
}

export const getSession = async sessionId => {
  if (!sessionId) return null

  if (isRedisConnected() && redisClient) {
    const key = SESSION_PREFIX + sessionId
    const data = await redisClient.get(key)
    if (!data) return null
    await redisClient.expire(key, SESSION_TTL_SECONDS) // sliding expiration
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
  if (isRedisConnected() && redisClient) {
    await redisClient.del(SESSION_PREFIX + sessionId)
  } else {
    memorySessions.delete(sessionId)
  }
}

export const requireAdminAuth = async (req, res, next) => {
  const sessionId = req.cookies?.sid
  const session = await getSession(sessionId)
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  req.admin = session
  next()
}
