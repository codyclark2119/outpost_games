import { OPEN_HOURS, WEEKDAYS, formatClock, toMinutes } from '../config/storeInfo'
import { getStoreClock } from './eventDateTime'

export interface StoreStatus {
  isOpen: boolean
  // "Until 10 PM" / "Opens today at 5:30 PM" / "Opens Tue at 5:30 PM"
  detail: string
}

// Open/closed right now in store-local time, plus when that next changes.
export const getStoreStatus = (now = new Date()): StoreStatus => {
  const { jsDay, minutes } = getStoreClock(now)

  const today = OPEN_HOURS[WEEKDAYS[jsDay] ?? 'Sun']
  if (today) {
    const [opens, closes] = today
    if (minutes < toMinutes(opens)) {
      return { isOpen: false, detail: `Opens today at ${formatClock(opens)}` }
    }
    if (minutes < toMinutes(closes)) {
      return { isOpen: true, detail: `Until ${formatClock(closes)}` }
    }
  }

  for (let ahead = 1; ahead <= 7; ahead++) {
    const day = WEEKDAYS[(jsDay + ahead) % 7] ?? 'Sun'
    const hours = OPEN_HOURS[day]
    if (hours) {
      return {
        isOpen: false,
        detail: `Opens ${ahead === 1 ? 'tomorrow' : day} at ${formatClock(hours[0])}`,
      }
    }
  }
  return { isOpen: false, detail: 'Closed' }
}
