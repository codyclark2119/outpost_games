// Shared "which date does this weekly slot fall on" math, used by both
// Home.vue's featured-day banner and Events.vue's weekly grid so the two
// views never drift on what "the next occurrence" means.

// Next date (today counts if it matches) whose getDay() === jsDay, at midnight.
export const nextOccurrenceOf = (jsDay: number, from: Date = new Date()): Date => {
  const date = new Date(from)
  date.setHours(0, 0, 0, 0)
  const diff = (jsDay - date.getDay() + 7) % 7
  date.setDate(date.getDate() + diff)
  return date
}

export const toISODate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
