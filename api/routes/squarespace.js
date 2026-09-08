import { asyncRoute, dependencyError } from '../middleware/errorHandler.js'
import { object, string } from '../schemas/validation.js'
import {
  getSquarespaceCatalog,
  refreshSquarespaceCatalog,
  getSquarespaceStatus,
  getAllAssignments,
  setAssignment,
} from '../squarespaceCache.js'
import { getAuthorizeUrl, handleOAuthCallback, getOAuthStatus } from '../squarespaceOAuth.js'
import {
  SquarespaceNotConfiguredError,
  SquarespaceNotAuthorizedError,
} from '../squarespaceErrors.js'
import { requireAdminAuth } from '../auth.js'

export function mountSquarespace(app) {
  // Legacy Squarespace routes are left in place only as documentation and can be
  // removed later once the Square integration is fully validated.
  app.get('/api/squarespace/products', async (req, res) => {
    try {
      const [{ fetchedAt, products }, assignments] = await Promise.all([
        getSquarespaceCatalog(),
        getAllAssignments(),
      ])
      const withAssignments = products.map(p => ({
        ...p,
        assignment: Object.hasOwn(assignments, p.id)
          ? assignments[p.id]
          : { typeId: null, setId: null },
      }))
      res.json({ fetchedAt, products: withAssignments })
    } catch (error) {
      console.error('❌ Error fetching Squarespace products:', error.message)
      res.status(500).json({ error: 'Failed to fetch Squarespace products' })
    }
  })

  // POST /api/squarespace/refresh — force a synchronous full refresh from Squarespace.
  app.post('/api/squarespace/refresh', requireAdminAuth, async (req, res) => {
    try {
      const cache = await refreshSquarespaceCatalog()
      res.json({ fetchedAt: cache.fetchedAt, productCount: cache.products.length })
    } catch (error) {
      if (error instanceof SquarespaceNotConfiguredError) {
        return res
          .status(503)
          .json({ error: 'Squarespace is not configured', message: error.message })
      }
      if (error instanceof SquarespaceNotAuthorizedError) {
        return res.status(503).json({
          error: 'Squarespace is not authorized',
          message: error.message,
          authorizeUrl: '/api/squarespace/oauth/authorize',
        })
      }
      console.error('❌ Squarespace refresh failed:', error.message)
      res.status(502).json({ error: 'Failed to refresh from Squarespace', message: error.message })
    }
  })

  // GET /api/squarespace/status — merges cache/product status with OAuth status
  // (configured/authorized/token expiry) so both auth paths are visible at once.
  app.get(
    '/api/squarespace/status',
    asyncRoute(async (req, res) => {
      const oauthStatus = await getOAuthStatus()
      res.json({ ...getSquarespaceStatus(), oauth: oauthStatus })
    })
  )

  // GET /api/squarespace/oauth/authorize — one-time human step: open this in a
  // browser after setting SQUARESPACE_CLIENT_ID/SECRET/REDIRECT_URI to grant
  // access on Squarespace's confirmation page. Only needed on plans without
  // Developer API Keys; skip entirely if using SQUARESPACE_API_KEY instead.
  app.get('/api/squarespace/oauth/authorize', (req, res) => {
    try {
      res.redirect(getAuthorizeUrl())
    } catch (error) {
      res
        .status(503)
        .json({ error: "Squarespace OAuth isn't configured yet", message: error.message })
    }
  })

  // GET /api/squarespace/oauth/callback — this must be the exact redirect_uri
  // registered with Squarespace. Exchanges the one-time code for tokens.
  // Responds with JSON (not res.send of an interpolated string) deliberately —
  // query params here are attacker-controlled since this is a public GET route,
  // and JSON can't be interpreted as HTML/script by a browser the way a
  // text/html response with reflected input could.
  app.get('/api/squarespace/oauth/callback', async (req, res) => {
    try {
      await handleOAuthCallback({
        code: req.query.code,
        state: req.query.state,
        error: req.query.error,
      })
      res.json({
        success: true,
        message: 'Squarespace connected successfully. You can close this tab.',
      })
    } catch (error) {
      console.error('❌ Squarespace OAuth callback failed:', error.message)
      res.status(400).json({ success: false, error: error.message })
    }
  })

  // PUT /api/squarespace/products/:productId/assignment — tag a Squarespace product
  // with a typeId/setId (or null to unassign). typeId/setId are opaque, admin-chosen
  // strings — no catalog to validate them against since the manual product catalog
  // was retired.
  app.put('/api/squarespace/products/:productId/assignment', requireAdminAuth, async (req, res) => {
    try {
      object(req.body, ['typeId', 'setId'])
      for (const field of ['typeId', 'setId'])
        if (req.body[field] != null) string(req.body[field], field)
      const { productId } = req.params
      const { typeId = null, setId = null } = req.body || {}

      if (typeId === null && setId !== null) {
        // A setId can't be scoped to anything without a typeId.
        return res.status(400).json({ error: 'setId requires a typeId' })
      }

      const assignment = await setAssignment(productId, { typeId, setId })
      res.json({ productId, assignment })
    } catch (error) {
      console.error('❌ Error setting Squarespace assignment:', error.message)
      return dependencyError(error, req, res)
    }
  })
}
