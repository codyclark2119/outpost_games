import { listMarketingPosters } from '../marketingPosters.js'

export function mountMarketingPosters(app) {
  // Homepage carousel — fully filesystem-driven, see marketingPosters.js.
  app.get('/api/marketing-posters', async (req, res) => {
    try {
      const posters = await listMarketingPosters(process.env)
      res.json({ ok: true, posters })
    } catch (error) {
      console.error('❌ Marketing posters listing failed:', error.message)
      res.status(500).json({ ok: false, error: 'Failed to list marketing posters' })
    }
  })
}
