import { useHead } from '@unhead/vue'

// Canonical production domain — index.html's static tags already use this;
// robots.txt/sitemap.xml previously pointed at a different (fly.dev) host,
// fixed to match this as part of the same SEO pass.
export const SITE_URL = 'https://outpostgamesrgv.com'
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`

// Per-route title/description/canonical/OG — before this, every route served
// identical meta tags from the static index.html. Colocated per-view (called
// from each surviving view's <script setup>) rather than centralized.
export function usePageMeta({
  title,
  description,
  path,
}: {
  title: string
  description: string
  path: string
}) {
  const url = `${SITE_URL}${path}`
  useHead({
    title,
    meta: [
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: url },
      { property: 'og:image', content: DEFAULT_OG_IMAGE },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: DEFAULT_OG_IMAGE },
    ],
    link: [{ rel: 'canonical', href: url }],
  })
}
