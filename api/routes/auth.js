import { asyncRoute } from '../middleware/errorHandler.js'
import { object, string } from '../schemas/validation.js'
import { verifyCredentials, createSession, destroySession, requireAdminAuth } from '../auth.js'

export function mountAuth(app, loginRateLimiter) {
  // ─── Admin auth ──────────────────────────────────────────────────────────────
  // `secure` is gated on actually running on Fly.io (not NODE_ENV, which this repo's
  // .env sets to "production" even for local dev) so the session cookie still works
  // over plain http://localhost while requiring HTTPS in the real deployment.
  const SESSION_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: Boolean(process.env.FLY_APP_NAME),
    sameSite: 'strict',
    maxAge: 12 * 60 * 60 * 1000, // 12 hours
  }

  app.post(
    '/api/auth/login',
    loginRateLimiter,
    asyncRoute(async (req, res) => {
      object(req.body, ['username', 'password'], ['username', 'password'])
      string(req.body.username, 'username')
      string(req.body.password, 'password')
      const { username, password } = req.body || {}
      const valid = await verifyCredentials(username, password)
      if (!valid) {
        return res.status(401).json({ error: 'Invalid username or password' })
      }

      const sessionId = await createSession(username)
      res.cookie('sid', sessionId, SESSION_COOKIE_OPTIONS)
      res.json({ ok: true, username })
    })
  )

  app.post(
    '/api/auth/logout',
    asyncRoute(async (req, res) => {
      await destroySession(req.cookies?.sid)
      res.clearCookie('sid', SESSION_COOKIE_OPTIONS)
      res.json({ ok: true })
    })
  )

  app.get('/api/auth/me', requireAdminAuth, (req, res) => {
    res.json({ username: req.admin.username })
  })
}
