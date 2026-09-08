import { STORE_INFO } from '../config/storeInfo'

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_RE = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i

type IsoDateParts = readonly [year: number, month: number, day: number]

const parseISODateParts = (value: string): IsoDateParts | null => {
  const match = ISO_DATE_RE.exec(value)
  if (!match) return null

  const [, yearText, monthText, dayText] = match
  if (!yearText || !monthText || !dayText) return null

  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const parsed = new Date(Date.UTC(year, month - 1, day))

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null
  }

  return [year, month, day]
}

export const eventDateToISO = (value: string): string | null => {
  const trimmed = value.trim()
  if (parseISODateParts(trimmed)) return trimmed

  const parsed = new Date(`${trimmed} 12:00:00 UTC`)
  if (Number.isNaN(parsed.getTime())) return null

  const iso = parsed.toISOString().slice(0, 10)
  return parseISODateParts(iso) ? iso : null
}

export const addDaysToISODate = (iso: string, days: number): string => {
  const parsed = parseISODateParts(iso)
  if (!parsed) throw new Error(`Invalid ISO date: ${iso}`)

  const [year, month, day] = parsed
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

export const weekdayFromISODate = (iso: string): number => {
  const parsed = parseISODateParts(iso)
  if (!parsed) throw new Error(`Invalid ISO date: ${iso}`)

  const [year, month, day] = parsed
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

const getStoreDateTimeParts = (date: Date) => {
  const formattedParts = new Intl.DateTimeFormat('en-US', {
    timeZone: STORE_INFO.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    formattedParts.find(part => part.type === type)?.value ?? ''

  return {
    dateISO: `${value('year')}-${value('month')}-${value('day')}`,
    hour: Number(value('hour')),
    minute: Number(value('minute')),
  }
}

export const getStoreTodayISO = (date = new Date()): string => getStoreDateTimeParts(date).dateISO

export const parseTimeToMinutes = (time: string): number | null => {
  const match = TIME_RE.exec(time.trim())
  if (!match) return null

  const [, hourText, minuteText, meridiemText] = match
  if (!hourText || !minuteText || !meridiemText) return null

  const hour = Number(hourText)
  const minute = Number(minuteText)
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null

  return ((hour % 12) + (meridiemText.toUpperCase() === 'PM' ? 12 : 0)) * 60 + minute
}

export const hasEventStarted = (dateISO: string, time: string, now = new Date()): boolean => {
  const current = getStoreDateTimeParts(now)

  if (dateISO < current.dateISO) return true
  if (dateISO > current.dateISO) return false

  const eventMinutes = parseTimeToMinutes(time)
  return eventMinutes === null ? false : current.hour * 60 + current.minute >= eventMinutes
}

export const formatStoreDateLabel = (iso: string): string =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${iso}T12:00:00Z`))
