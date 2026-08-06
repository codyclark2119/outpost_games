// Canonical weekly recurring event schedule — previously duplicated
// independently across Home.vue (x2: the featured-event fallback and the
// standalone "Weekly Events" grid) and Events.vue.
// A day can carry more than one entry (e.g. Friday has both Nexus Night and
// FNM) — every consumer must key/group on more than just dayName.
export interface WeeklyScheduleEntry {
  id: string // stable, manually-assigned — foreign key for per-date hide overrides, never derive from eventName/dayName
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
    id: 'wed-dnd',
    jsDay: 3,
    dayName: 'Wednesday',
    eventName: 'D&D',
    time: '6:00 PM',
    description: 'Weekly Dungeons & Dragons campaign session',
    gameType: 'Dungeons & Dragons',
    gameTypeId: 'dnd',
  },
  {
    id: 'wed-pokemon-league',
    jsDay: 3,
    dayName: 'Wednesday',
    eventName: 'Pokémon League',
    time: '6:00 PM',
    description: 'Weekly Pokémon TCG league play',
    gameType: 'Pokémon',
    gameTypeId: 'pokemon',
  },
  {
    id: 'thu-free-play',
    jsDay: 4,
    dayName: 'Thursday',
    eventName: 'Free Play',
    time: '6:00 PM',
    description: 'Open free play — bring any game, casual and low-key',
    gameType: 'All Games',
    gameTypeId: 'other',
  },
  {
    id: 'thu-on-demand-tournament',
    jsDay: 4,
    dayName: 'Thursday',
    eventName: 'On-Demand Tournament',
    time: '6:00 PM',
    description: 'Casual tournament that forms once enough players are ready to play',
    gameType: 'Varies',
    gameTypeId: 'other',
  },
  {
    id: 'fri-nexus-night',
    jsDay: 5,
    dayName: 'Friday',
    eventName: 'Nexus Night',
    time: '6:00 PM',
    description: 'Weekly Riftbound tournament night',
    gameType: 'Riftbound',
    gameTypeId: 'riftbound',
  },
  {
    id: 'fri-fnm',
    jsDay: 5,
    dayName: 'Friday',
    eventName: 'FNM',
    time: '6:00 PM',
    description: 'Friday Night Magic — weekly tournament with prizes for top finishers',
    gameType: 'Magic: The Gathering',
    gameTypeId: 'magic',
  },
  {
    id: 'sat-modern',
    jsDay: 6,
    dayName: 'Saturday',
    eventName: 'Modern',
    time: '6:00 PM',
    description: 'Modern format tournament with prizes for top finishers',
    gameType: 'Magic: The Gathering',
    gameTypeId: 'magic',
  },
  {
    id: 'sat-on-demand-tournament',
    jsDay: 6,
    dayName: 'Saturday',
    eventName: 'On-Demand Tournament',
    time: '6:00 PM',
    description: 'Casual tournament that forms once enough players are ready to play',
    gameType: 'Varies',
    gameTypeId: 'other',
  },
  {
    id: 'sun-league-day',
    jsDay: 0,
    dayName: 'Sunday',
    eventName: 'League Day',
    time: '6:00 PM',
    description: 'Ongoing league play with seasonal prizes',
    gameType: 'Magic: The Gathering',
    gameTypeId: 'magic',
  },
]
