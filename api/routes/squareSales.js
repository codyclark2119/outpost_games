import { dependencyError } from '../middleware/errorHandler.js'
import { getSquareSalesReport } from '../squareOrdersClient.js'
import { requireAdminAuth } from '../auth.js'
export function mountSquareSales(app) {
  app.get('/api/square/sales', requireAdminAuth, async (req, res) => {
    try {
      for (const value of [req.query.from, req.query.to])
        if (value !== undefined && (typeof value !== 'string' || Number.isNaN(Date.parse(value))))
          return res.status(400).json({ error: 'Invalid report date' })
      const to = req.query.to ? new Date(req.query.to).toISOString() : new Date().toISOString()
      const from = req.query.from
        ? new Date(req.query.from).toISOString()
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const granularity = ['week', 'month'].includes(req.query.granularity)
        ? req.query.granularity
        : 'day'

      const report = await getSquareSalesReport({ from, to, granularity }, process.env)
      res.json(report)
    } catch (error) {
      return dependencyError(error, req, res)
    }
  })
}
