import storeConfig from '../storeConfig.json' with { type: 'json' }
import { SITE_URL } from './siteUrl.js'

// Everything a shared event link needs that the single-page app can't do on
// its own: a calendar file phones open straight into their calendar app, and
// a small HTML page carrying the event's own title/description for link
// previews (Discord, Facebook and iMessage read meta tags without running
// JavaScript, so the SPA's per-page tags never reach them).

const STORE = {
  name: 'The Outpost Games',
  // Mirrors STORE_INFO.address in src/config/storeInfo.ts.
  address: '605 W. Main Street, Suite 4, Rio Grande City, TX 78582',
}
// Events don't store an end time. Long enough to cover a typical tournament,
// so the calendar entry blocks out the evening rather than a single minute.
const DEFAULT_DURATION_MINUTES = 4 * 60

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]

// Events are stored as "October 25, 2026" (older ones may be ISO).
export const eventDateISO = value => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const m = trimmed.match(/^(?:[A-Za-z]+,?\s+)?([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/)
  if (!m) return null
  const month = MONTHS.indexOf(m[1].toLowerCase()) + 1
  if (!month) return null
  return `${m[3]}-${String(month).padStart(2, '0')}-${m[2].padStart(2, '0')}`
}

export const eventMinutes = value => {
  const m = typeof value === 'string' && value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!m) return null
  return ((Number(m[1]) % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + Number(m[2])
}

const wallClock = (instant, timeZone) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
      .formatToParts(new Date(instant))
      .map(p => [p.type, p.value])
  )
  return Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00Z`)
}

// Store wall-clock date + time → UTC instant, DST-correct for the shop's zone
// (same approach as the frontend's eventStartISO).
export const eventStart = (event, timeZone = storeConfig.timeZone) => {
  const iso = eventDateISO(event.date)
  const minutes = eventMinutes(event.time)
  if (!iso || minutes === null) return null
  const wall = Date.parse(`${iso}T00:00:00Z`) + minutes * 60000
  let instant = wall
  for (let i = 0; i < 3; i++) instant += wall - wallClock(instant, timeZone)
  return new Date(instant)
}

const icsStamp = date =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
const icsText = value =>
  String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
// RFC 5545 caps lines at 75 octets; longer ones continue on a line starting
// with a space.
const fold = line => {
  const out = []
  let rest = line
  while (Buffer.byteLength(rest) > 75) {
    let cut = 75
    while (Buffer.byteLength(rest.slice(0, cut)) > 75) cut--
    out.push(rest.slice(0, cut))
    rest = ' ' + rest.slice(cut)
  }
  out.push(rest)
  return out.join('\r\n')
}

export const entryLabel = entry => {
  const n = Number(entry)
  return Number.isFinite(n) && n > 0 ? `$${n % 1 ? n.toFixed(2) : n} entry` : 'Free entry'
}

export const buildEventIcs = (event, now = new Date()) => {
  const start = eventStart(event)
  if (!start) return null
  const end = new Date(start.getTime() + DEFAULT_DURATION_MINUTES * 60000)
  const url = `${SITE_URL}/events/${encodeURIComponent(event.id)}`
  const description = [event.description, entryLabel(event.entry), url].filter(Boolean).join('\n\n')
  return (
    [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//The Outpost Games//Events//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${event.id}@outpostgamesrgv.com`,
      `DTSTAMP:${icsStamp(now)}`,
      `DTSTART:${icsStamp(start)}`,
      `DTEND:${icsStamp(end)}`,
      `SUMMARY:${icsText(event.title)}`,
      `DESCRIPTION:${icsText(description)}`,
      `LOCATION:${icsText(`${STORE.name}, ${STORE.address}`)}`,
      `URL:${url}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ]
      .map(fold)
      .join('\r\n') + '\r\n'
  )
}

const html = value =>
  String(value ?? '').replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  )

export const eventSummaryLine = event => {
  const iso = eventDateISO(event.date)
  const day = iso
    ? new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }).format(new Date(`${iso}T12:00:00Z`))
    : event.date
  return `${day} at ${event.time} · ${entryLabel(event.entry)} · ${STORE.name}, Rio Grande City`
}

// A tiny page for link-preview bots; people opening it are sent straight on
// to the real event page.
export const buildEventShareHtml = event => {
  const pageUrl = `${SITE_URL}/events/${encodeURIComponent(event.id)}`
  const title = `${event.title} — ${STORE.name}`
  const description = `${eventSummaryLine(event)}. ${event.description || ''}`.trim().slice(0, 300)
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${html(title)}</title>
<meta name="description" content="${html(description)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="${html(STORE.name)}" />
<meta property="og:title" content="${html(event.title)}" />
<meta property="og:description" content="${html(description)}" />
<meta property="og:url" content="${html(pageUrl)}" />
<meta property="og:image" content="${html(SITE_URL)}/og-image.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${html(event.title)}" />
<meta name="twitter:description" content="${html(description)}" />
<link rel="canonical" href="${html(pageUrl)}" />
<meta http-equiv="refresh" content="0; url=${html(pageUrl)}" />
</head>
<body><p><a href="${html(pageUrl)}">${html(event.title)}</a></p></body>
</html>
`
}
