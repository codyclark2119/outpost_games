// Square serves product photos exactly as uploaded, often 2000px PNGs of
// several MB, for cards drawn about 270px wide. On the live site, Cloudflare's
// image transformations (/cdn-cgi/image/) resize them and convert them to
// WebP/AVIF at the edge, where they stay cached. Anywhere else (local dev,
// fly.dev) the original URL is used as is.
//
// Needs Images > Transformations switched on for the zone in Cloudflare, with
// items-images-production.s3.us-west-2.amazonaws.com allowed as a source. The
// free plan covers 5,000 unique transformations a month; each photo uses one
// per width below. If a resized copy ever fails, `fallBackToOriginal` swaps the
// original back in, so a photo is never left broken.
const TRANSFORM_HOSTS = new Set(['outpostgamesrgv.com', 'www.outpostgamesrgv.com'])
const WIDTHS = [320, 640] as const

const canTransform = (url: string) =>
  typeof window !== 'undefined' &&
  TRANSFORM_HOSTS.has(window.location.hostname) &&
  url.startsWith('https://')

const resized = (url: string, width: number) =>
  `/cdn-cgi/image/width=${width},quality=80,format=auto,fit=scale-down/${url}`

export const productImageSrc = (url: string) => (canTransform(url) ? resized(url, WIDTHS[0]) : url)

export const productImageSrcset = (url: string) =>
  canTransform(url) ? WIDTHS.map(width => `${resized(url, width)} ${width}w`).join(', ') : undefined

export const fallBackToOriginal = (event: Event, url: string) => {
  const img = event.target as HTMLImageElement
  if (img.getAttribute('src') === url) return
  img.removeAttribute('srcset')
  img.src = url
}
