import type { SpecialEvent } from '../stores/events'
import type { WeeklyOverride } from '../stores/weeklyOverrides'
import type { WeeklyScheduleEntry } from '../config/weeklySchedule'
import {
  addDaysToISODate,
  eventDateToISO,
  formatStoreDateLabel,
  getStoreTodayISO,
  hasEventStarted,
  weekdayFromISODate,
  parseTimeToMinutes,
} from './eventDateTime'
export interface FeaturedDayEvent {
  key: string
  title: string
  time: string
  entry: string
  description: string
  gameTypeId?: string
  gameTypeName?: string
  isWeekly: boolean
}
interface FeaturedDay {
  date: string
  hasWeekly: boolean
  hasSpecial: boolean
  events: FeaturedDayEvent[]
}
export interface AgendaDay {
  dateISO: string
  // 'Today' / 'Tomorrow', or null for any later day
  relative: string | null
  events: FeaturedDayEvent[]
}

// Every not-yet-started event on one store-local date: visible specials plus
// weekly entries for that weekday that haven't been hidden for that exact
// date, in start-time order.
const eventsOnDate = (
  targetDateISO: string,
  specialEvents: SpecialEvent[],
  schedule: WeeklyScheduleEntry[],
  overrides: WeeklyOverride[],
  now: Date
) => {
  const specials: FeaturedDayEvent[] = specialEvents
    .filter(
      e =>
        e.isVisible !== false &&
        eventDateToISO(e.date) === targetDateISO &&
        !hasEventStarted(targetDateISO, e.time, now)
    )
    .map(e => ({
      key: `special-${e.id}`,
      title: e.title,
      time: e.time,
      entry: e.entry,
      description: e.description,
      gameTypeId: e.gameTypeId,
      gameTypeName: e.gameTypeName,
      isWeekly: false,
    }))
  const weekly: FeaturedDayEvent[] = schedule
    .filter(
      entry =>
        entry.jsDay === weekdayFromISODate(targetDateISO) &&
        !overrides.some(o => o.weeklyEventId === entry.id && o.date === targetDateISO) &&
        !hasEventStarted(targetDateISO, entry.time, now)
    )
    .map(entry => ({
      key: `weekly-${entry.id}`,
      title: entry.eventName,
      time: entry.time,
      entry: '0.00',
      description: entry.description,
      gameTypeId: entry.gameTypeId,
      gameTypeName: entry.gameType,
      isWeekly: true,
    }))
  const events = [...specials, ...weekly].sort(
    (a, b) => (parseTimeToMinutes(a.time) ?? 0) - (parseTimeToMinutes(b.time) ?? 0)
  )
  return { specials, weekly, events }
}

export function getFeaturedDay(
  specialEvents: SpecialEvent[],
  schedule: WeeklyScheduleEntry[],
  overrides: WeeklyOverride[],
  now = new Date()
): FeaturedDay | null {
  const todayISO = getStoreTodayISO(now)
  for (let daysAhead = 0; daysAhead <= 7; daysAhead++) {
    const targetDateISO = addDaysToISODate(todayISO, daysAhead)
    const { specials, weekly, events } = eventsOnDate(
      targetDateISO,
      specialEvents,
      schedule,
      overrides,
      now
    )
    if (events.length)
      return {
        date: formatStoreDateLabel(targetDateISO),
        hasWeekly: weekly.length > 0,
        hasSpecial: specials.length > 0,
        events,
      }
  }
  return null
}

// Day-by-day agenda for the next `days` store-local days (today included),
// skipping days with nothing on. Same per-date rules as getFeaturedDay.
export function getAgenda(
  specialEvents: SpecialEvent[],
  schedule: WeeklyScheduleEntry[],
  overrides: WeeklyOverride[],
  { days = 7, now = new Date() }: { days?: number; now?: Date } = {}
): AgendaDay[] {
  const todayISO = getStoreTodayISO(now)
  const agenda: AgendaDay[] = []
  for (let daysAhead = 0; daysAhead < days; daysAhead++) {
    const dateISO = addDaysToISODate(todayISO, daysAhead)
    const { events } = eventsOnDate(dateISO, specialEvents, schedule, overrides, now)
    if (!events.length) continue
    agenda.push({
      dateISO,
      relative: daysAhead === 0 ? 'Today' : daysAhead === 1 ? 'Tomorrow' : null,
      events,
    })
  }
  return agenda
}
