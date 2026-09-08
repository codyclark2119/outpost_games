import { dependencyError } from '../middleware/errorHandler.js'
import { requireAdminAuth } from '../auth.js'
import { runMonthlyInventoryExport } from '../inventoryExport.js'
import { isMailConfigured, MailNotConfiguredError } from '../mailClient.js'

export function mountInventoryExport(app) {
  // Manual trigger for the monthly inventory export — lets an admin test the
  // email/xlsx pipeline on demand, or re-run it if the 1st was missed (e.g. the
  // server was down). The scheduler in inventoryExport.js otherwise fires this
  // automatically once per month.
  app.post('/api/admin/inventory-export/run', requireAdminAuth, async (req, res) => {
    if (!isMailConfigured(process.env)) {
      return res.status(503).json({
        ok: false,
        error: 'Email is not configured — set GMAIL_USER and GMAIL_APP_PASSWORD',
      })
    }
    try {
      const result = await runMonthlyInventoryExport(process.env)
      res.json({ ok: true, ...result })
    } catch (error) {
      if (error instanceof MailNotConfiguredError) {
        return res.status(503).json({ ok: false, error: error.message })
      }
      console.error('❌ Manual inventory export failed:', error.message)
      return dependencyError(error, req, res, 'Inventory export failed')
    }
  })
}
