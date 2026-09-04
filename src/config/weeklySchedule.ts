// Canonical weekly recurring event schedule — previously duplicated
// independently across Home.vue (x2: the featured-event fallback and the
// standalone "Weekly Events" grid) and Events.vue.
// A day can carry more than one entry (e.g. Wednesday has both D&D and One
// Piece) — every consumer must key/group on more than just dayName.
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
    id: 'tue-shop-league',
    jsDay: 2,
    dayName: 'Tuesday',
    eventName: 'Shop League Event',
    time: '6:00 PM',
    description: 'Weekly shop league night — ongoing league play with seasonal prizes',
    gameType: 'All Games',
    gameTypeId: 'other',
  },
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
    id: 'wed-one-piece',
    jsDay: 3,
    dayName: 'Wednesday',
    eventName: 'One Piece',
    time: '6:00 PM',
    description: 'Weekly One Piece Card Game night',
    gameType: 'One Piece',
    gameTypeId: 'one-piece',
  },
  {
    id: 'thu-nexus-night',
    jsDay: 4,
    dayName: 'Thursday',
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
    eventName: 'Friday Night Magic',
    time: '6:00 PM',
    description: 'Weekly Magic tournament with prizes for top finishers',
    gameType: 'Magic: The Gathering',
    gameTypeId: 'magic',
  },
  {
    id: 'fri-pokemon',
    jsDay: 5,
    dayName: 'Friday',
    eventName: 'Pokémon',
    time: '6:00 PM',
    description: 'Weekly Pokémon TCG league play',
    gameType: 'Pokémon',
    gameTypeId: 'pokemon',
  },
  {
    id: 'sat-one-piece',
    jsDay: 6,
    dayName: 'Saturday',
    eventName: 'One Piece',
    time: '6:00 PM',
    description: 'Weekly One Piece Card Game tournament',
    gameType: 'One Piece',
    gameTypeId: 'one-piece',
  },
]
