import type { SpecialEvent } from '../stores/events'
import { SITE_URL } from '../composables/usePageMeta'
import { STORE_INFO } from '../config/storeInfo'
import { eventDateToISO, eventStartISO, hasEventStarted } from './eventDateTime'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Same length the API's calendar file uses, so both calendar buttons agree.
const EVENT_DURATION_MINUTES = 4 * 60

export type UpcomingSpecial = SpecialEvent & { iso: string }

// Visible specials that haven't started yet, soonest first. The events store
// holds the raw list (finished and hidden events included), so every public
// view goes through this rather than filtering for itself.
export const upcomingSpecials = (events: SpecialEvent[], now = new Date()): UpcomingSpecial[] =>
  events
    .filter(event => event.isVisible !== false)
    .map(event => ({ ...event, iso: eventDateToISO(event.date) }))
    .filter((event): event is UpcomingSpecial =>
      Boolean(event.iso && !hasEventStarted(event.iso, event.time, now))
    )
    .sort((a, b) => a.iso.localeCompare(b.iso))

export const eventPath = (id: string) => `/events/${encodeURIComponent(id)}`

// What gets shared: an API page that carries this event's own title and
// details for Discord/Facebook/iMessage previews, then forwards people to
// eventPath. Sharing eventPath directly would preview as the generic site.
export const eventShareUrl = (id: string) =>
  `${SITE_URL}/api/share/events/${encodeURIComponent(id)}`

// Phones open this straight into Apple Calendar / Outlook / most Android
// calendar apps.
export const eventCalendarFileUrl = (id: string) =>
  `${API_BASE_URL}/events/${encodeURIComponent(id)}/calendar.ics`

const googleStamp = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '')

export const googleCalendarUrl = (event: SpecialEvent): string | null => {
  const start = eventStartISO(event.date, event.time)
  if (!start) return null
  const end = new Date(Date.parse(start) + EVENT_DURATION_MINUTES * 60000).toISOString()
  const { line1, city, state, zip } = STORE_INFO.address
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${googleStamp(start)}/${googleStamp(end)}`,
    details: [event.description, `${SITE_URL}${eventPath(event.id)}`].filter(Boolean).join('\n\n'),
    location: `${STORE_INFO.name}, ${line1}, ${city}, ${state} ${zip}`,
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

export const entryLabel = (entry: string) => {
  const n = Number(entry)
  return Number.isFinite(n) && n > 0 ? `$${n % 1 ? n.toFixed(2) : n} entry` : 'Free entry'
}
