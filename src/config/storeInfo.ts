import storeConfig from '../../api/storeConfig.json'

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
export type Weekday = (typeof WEEKDAYS)[number]

const WEEKDAY_NAMES: Record<Weekday, string> = {
  Sun: 'Sunday',
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
}

// Store-local opening hours, keyed by weekday ("Tue" -> ["17:30", "22:00"]);
// a missing day is closed. Lives in api/storeConfig.json because the API's
// public-catalog cache keys its refresh rate off the same hours — changing
// hours is one edit there, and every display below derives from it.
export const OPEN_HOURS = storeConfig.openHours as Partial<Record<Weekday, [string, string]>>

export const toMinutes = (hhmm: string) => {
  const [hour = 0, minute = 0] = hhmm.split(':').map(Number)
  return hour * 60 + minute
}

// "17:30" -> "5:30 PM", "22:00" -> "10 PM" (whole hours drop the ":00").
export const formatClock = (hhmm: string) => {
  const [hour = 0, minute = 0] = hhmm.split(':').map(Number)
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return minute === 0
    ? `${hour12} ${suffix}`
    : `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`
}

const rangeLabel = (hours: [string, string] | undefined) =>
  hours ? `${formatClock(hours[0])} – ${formatClock(hours[1])}` : 'Closed'

// One row per weekday, Sunday first — the Visit section lists every day so
// "is it open Thursday?" never needs mental range math on a phone.
export const HOURS_BY_DAY = WEEKDAYS.map((day, jsDay) => ({
  day,
  jsDay,
  name: WEEKDAY_NAMES[day],
  label: rangeLabel(OPEN_HOURS[day]),
  isOpen: Boolean(OPEN_HOURS[day]),
}))

// Consecutive days with identical hours collapsed ("Tue–Sat": "5:30 PM – 10 PM")
// for compact spots like the footer.
const groupHours = () => {
  const groups: { from: Weekday; to: Weekday; label: string }[] = []
  for (const { day, label } of HOURS_BY_DAY) {
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.to = day
    else groups.push({ from: day, to: day, label })
  }
  return Object.fromEntries(
    groups.map(({ from, to, label }) => [from === to ? from : `${from}–${to}`, label])
  )
}

// Single source of truth for store facts.
export const STORE_INFO = {
  name: 'The Outpost Games',
  address: {
    line1: '605 W. Main Street, Suite 4',
    city: 'Rio Grande City',
    state: 'TX',
    zip: '78582',
    full: '605 W. Main Street, Suite 4, Rio Grande City, TX 78582',
  },
  email: 'theoutpostgamingrgv@gmail.com',
  timeZone: storeConfig.timeZone,
  hours: groupHours(),
  social: {
    // The Linktree is the shop's hub for every social account (TikTok
    // included) — it's the "all our links" destination wherever socials appear.
    linktree: 'https://linktr.ee/TheOutpostGamesRGC',
    instagram: 'https://www.instagram.com/theoutpostgames_rgc',
    facebook: 'https://www.facebook.com/Theoutpostgames/',
    discord: 'https://discord.gg/PW3YkMtFmz',
  },
  mapsUrl: 'https://maps.app.goo.gl/BqKucUkatQgWTmjM7',
}
