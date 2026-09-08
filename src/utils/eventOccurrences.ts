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
interface FeaturedDayEvent {
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
export function getFeaturedDay(
  specialEvents: SpecialEvent[],
  schedule: WeeklyScheduleEntry[],
  overrides: WeeklyOverride[],
  now = new Date()
): FeaturedDay | null {
  const todayISO = getStoreTodayISO(now)
  for (let daysAhead = 0; daysAhead <= 7; daysAhead++) {
    const targetDateISO = addDaysToISODate(todayISO, daysAhead)
    const specials = specialEvents
      .filter(
        e =>
          e.isVisible !== false &&
          eventDateToISO(e.date) === targetDateISO &&
          !hasEventStarted(targetDateISO, e.time, now)
      )
      .map(e => ({
        title: e.title,
        time: e.time,
        entry: e.entry,
        description: e.description,
        gameTypeId: e.gameTypeId,
        gameTypeName: e.gameTypeName,
        isWeekly: false,
      }))
    const weekly = schedule
      .filter(
        entry =>
          entry.jsDay === weekdayFromISODate(targetDateISO) &&
          !overrides.some(o => o.weeklyEventId === entry.id && o.date === targetDateISO) &&
          !hasEventStarted(targetDateISO, entry.time, now)
      )
      .map(entry => ({
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
