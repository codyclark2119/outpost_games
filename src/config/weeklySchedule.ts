// Canonical weekly recurring event schedule — previously duplicated
// independently across Home.vue (x2: the featured-event fallback and the
// standalone "Weekly Events" grid) and Events.vue.
export interface WeeklyScheduleEntry {
  jsDay: number // JS Date.getDay() — 0 = Sunday
  dayName: string
  eventName: string
  time: string
  description: string
  gameType: string
}

export const WEEKLY_SCHEDULE: WeeklyScheduleEntry[] = [
  {
    jsDay: 4,
    dayName: 'Thursday',
    eventName: 'Standard',
    time: '6:00 PM',
    description: 'Standard format tournament with prizes for top finishers',
    gameType: 'Magic: The Gathering',
  },
  {
    jsDay: 5,
    dayName: 'Friday',
    eventName: 'cEDH',
    time: '6:00 PM',
    description: 'Competitive Commander tournament for experienced players',
    gameType: 'Magic: The Gathering',
  },
  {
    jsDay: 6,
    dayName: 'Saturday',
    eventName: 'Bracket 3',
    time: '6:00 PM',
    description: 'Swiss tournament format with elimination rounds',
    gameType: 'Magic: The Gathering',
  },
  {
    jsDay: 0,
    dayName: 'Sunday',
    eventName: 'League Event',
    time: '6:00 PM',
    description: 'Ongoing league play with seasonal prizes',
    gameType: 'Magic: The Gathering',
  },
]
