import { addDaysToISODate, getStoreTodayISO, weekdayFromISODate } from './eventDateTime'
// Date is a UTC-noon calendar carrier, not an event start timestamp.
export const nextOccurrenceOf = (jsDay: number, from: Date = new Date()): Date => {
  const today = getStoreTodayISO(from)
  const iso = addDaysToISODate(today, (jsDay - weekdayFromISODate(today) + 7) % 7)
  return new Date(`${iso}T12:00:00Z`)
}
export const toISODate = (date: Date): string => date.toISOString().slice(0, 10)
