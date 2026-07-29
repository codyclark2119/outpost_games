// Canonical weekly recurring event schedule — previously duplicated
// independently across Home.vue (x2: the featured-event fallback and the
// standalone "Weekly Events" grid) and Events.vue.
// A day can carry more than one entry (e.g. Friday has both Nexus Night and
// FNM) — every consumer must key/group on more than just dayName.
export interface WeeklyScheduleEntry {
  jsDay: number // JS Date.getDay() — 0 = Sunday
  dayName: string
  eventName: string
  time: string
  description: string
  gameType: string
  gameTypeId: string
}

export const WEEKLY_SCHEDULE: WeeklyScheduleEntry[] = [
  {
    jsDay: 3,
    dayName: 'Wednesday',
    eventName: 'D&D',
    time: '6:00 PM',
    description: 'Weekly Dungeons & Dragons campaign session',
    gameType: 'Dungeons & Dragons',
    gameTypeId: 'dnd',
  },
  {
    jsDay: 3,
    dayName: 'Wednesday',
    eventName: 'Pokémon League',
    time: '6:00 PM',
    description: 'Weekly Pokémon TCG league play',
    gameType: 'Pokémon',
    gameTypeId: 'pokemon',
  },
  {
    jsDay: 4,
    dayName: 'Thursday',
    eventName: 'Free Play',
    time: '6:00 PM',
    description: 'Open free play — bring any game, casual and low-key',
    gameType: 'All Games',
    gameTypeId: 'other',
  },
  {
    jsDay: 4,
    dayName: 'Thursday',
    eventName: 'On-Demand Tournament',
    time: '6:00 PM',
    description: 'Casual tournament that forms once enough players are ready to play',
    gameType: 'Varies',
    gameTypeId: 'other',
  },
  {
    jsDay: 5,
    dayName: 'Friday',
    eventName: 'Nexus Night',
    time: '6:00 PM',
    description: 'Weekly Riftbound tournament night',
    gameType: 'Riftbound',
    gameTypeId: 'riftbound',
  },
  {
    jsDay: 5,
    dayName: 'Friday',
    eventName: 'FNM',
    time: '6:00 PM',
    description: 'Friday Night Magic — weekly tournament with prizes for top finishers',
    gameType: 'Magic: The Gathering',
    gameTypeId: 'magic',
  },
  {
    jsDay: 6,
    dayName: 'Saturday',
    eventName: 'Modern',
    time: '6:00 PM',
    description: 'Modern format tournament with prizes for top finishers',
    gameType: 'Magic: The Gathering',
    gameTypeId: 'magic',
  },
  {
    jsDay: 6,
    dayName: 'Saturday',
    eventName: 'On-Demand Tournament',
    time: '6:00 PM',
    description: 'Casual tournament that forms once enough players are ready to play',
    gameType: 'Varies',
    gameTypeId: 'other',
  },
  {
    jsDay: 0,
    dayName: 'Sunday',
    eventName: 'League Day',
    time: '6:00 PM',
    description: 'Ongoing league play with seasonal prizes',
    gameType: 'Magic: The Gathering',
    gameTypeId: 'magic',
  },
]
