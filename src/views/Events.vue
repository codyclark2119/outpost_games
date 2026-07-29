<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 py-12">
    <div class="container mx-auto px-4">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-12 hero-content">
          <h1
            class="font-cinzel text-4xl md:text-5xl font-bold mb-4 text-gray-800 section-heading inline-block"
          >
            Events & Tournaments
          </h1>
          <p class="text-gray-600 text-lg">Join us for weekly battles and special tournaments</p>
        </div>

        <!-- Upcoming Special Events — shown first so one-off tournaments are
             immediately visible rather than buried under the recurring
             weekly schedule -->
        <div class="card relative overflow-hidden special-events-card mb-16">
          <div
            class="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-outpost-gold/20 to-transparent rounded-br-full"
          ></div>
          <div
            class="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl from-outpost-gold/20 to-transparent rounded-tl-full"
          ></div>

          <div class="relative z-10">
            <h2 class="font-cinzel text-2xl font-bold mb-6 text-gray-800">
              Upcoming Special Events
            </h2>

            <div v-if="eventsStore.loading" class="text-center py-8">
              <div
                class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-outpost-navy"
              ></div>
            </div>

            <div
              v-else-if="eventsStore.upcomingEvents.length === 0"
              class="text-center py-8 text-gray-500"
            >
              No upcoming special events right now. Check back soon!
            </div>

            <div v-else class="space-y-4">
              <div
                v-for="(event, index) in eventsStore.upcomingEvents"
                :key="event.id"
                class="flex items-start space-x-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 border border-transparent hover:border-outpost-gold/30 special-event-item"
                :style="{ animationDelay: `${index * 0.1}s` }"
              >
                <!-- Icon / game type indicator -->
                <div
                  class="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-outpost-gold to-outpost-gold-dark flex items-center justify-center shadow-md"
                >
                  <CalendarDaysIcon class="w-6 h-6 text-white" />
                </div>

                <div class="flex-grow min-w-0">
                  <div class="flex flex-wrap items-center gap-2 mb-1">
                    <h3 class="font-semibold text-lg text-gray-800">{{ event.title }}</h3>
                    <!-- Game type badge -->
                    <span
                      v-if="event.gameTypeName"
                      class="inline-block text-xs px-2.5 py-0.5 rounded-full font-medium"
                      :class="gameTypeBadgeClass(event.gameTypeId)"
                    >
                      {{ event.gameTypeName }}
                    </span>
                  </div>
                  <p class="text-outpost-gold font-medium mb-1">
                    {{ event.date }} at {{ event.time }}
                  </p>
                  <p class="text-gray-600 text-sm">{{ event.description }}</p>
                </div>

                <div class="text-right flex-shrink-0">
                  <p class="font-bold text-xl text-outpost-navy">${{ event.entry }}</p>
                  <p class="text-xs text-gray-600">Entry Fee</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Weekly Schedule -->
        <h2 class="font-cinzel text-2xl font-bold text-center mb-2 text-gray-800">
          Weekly Schedule
        </h2>
        <p class="text-center text-gray-500 text-sm mb-8">
          These events run every week. No signup required.
        </p>

        <!-- flex-wrap + justify-center (rather than a plain grid) so a
             remainder row centers itself instead of left-aligning — with the
             5 day-groups this currently has, 3 fit per row at lg: and the
             trailing 2 center on their own row underneath, forming the
             requested "upside-down pyramid" shape rather than grid's default
             left-aligned last row. -->
        <div class="flex flex-wrap justify-center gap-6 mb-16">
          <div
            v-for="(group, index) in groupedWeeklySchedule"
            :key="group.dayName"
            class="card text-center event-card group relative w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]"
            :style="{ animationDelay: `${index * 0.1}s` }"
          >
            <!-- Recurring badge -->
            <div class="flex justify-center mb-3">
              <span
                class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-outpost-gold/15 text-outpost-gold-dark border border-outpost-gold/30"
              >
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                    clip-rule="evenodd"
                  />
                </svg>
                Recurring Weekly
              </span>
            </div>

            <div
              class="w-16 h-16 bg-gradient-to-br from-outpost-navy to-outpost-navy-light rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-outpost-gold/50 transition-all duration-300 group-hover:scale-110"
            >
              <CalendarDaysIcon class="w-8 h-8 text-outpost-gold" />
            </div>
            <h3 class="font-cinzel font-semibold text-xl mb-3 text-outpost-navy">
              {{ group.dayName }}
            </h3>

            <!-- Stacked events for this day -->
            <div class="divide-y divide-gray-100">
              <div
                v-for="(event, eventIndex) in group.events"
                :key="event.eventName"
                :class="eventIndex > 0 ? 'pt-4 mt-4' : ''"
              >
                <p class="text-gray-800 font-medium text-lg mb-2">{{ event.eventName }}</p>
                <p class="text-outpost-gold font-semibold mb-2">{{ event.time }}</p>
                <p class="text-gray-600 text-sm mt-2">{{ event.description }}</p>

                <!-- Game type badge -->
                <div class="mt-3 flex justify-center">
                  <span
                    class="inline-block text-xs px-2.5 py-1 rounded-full bg-outpost-navy/10 text-outpost-navy font-medium"
                  >
                    {{ event.gameType }}
                  </span>
                </div>
              </div>
            </div>

            <div
              class="absolute inset-0 bg-gradient-to-br from-outpost-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useHead } from '@unhead/vue'
import { CalendarDaysIcon } from '@heroicons/vue/24/outline'
import { useEventsStore } from '../stores/events'
import { WEEKLY_SCHEDULE, type WeeklyScheduleEntry } from '../config/weeklySchedule'
import { usePageMeta, SITE_URL } from '../composables/usePageMeta'
import { STORE_INFO } from '../config/storeInfo'

usePageMeta({
  title: 'Events & Tournaments — The Outpost Games',
  description:
    'Weekly tournaments and special events at The Outpost Games in Rio Grande City, TX — Magic: The Gathering, Pokémon, One Piece, Gundam, and Riftbound.',
  path: '/events',
})

const eventsStore = useEventsStore()

// Groups same-day entries (e.g. Friday's Nexus Night + FNM) into a single
// stacked card instead of one card per event — preserves WEEKLY_SCHEDULE's
// own day ordering since that's the order the cards should read in.
interface WeeklyDayGroup {
  dayName: string
  events: WeeklyScheduleEntry[]
}

const groupedWeeklySchedule = computed((): WeeklyDayGroup[] => {
  const groups: WeeklyDayGroup[] = []
  for (const entry of WEEKLY_SCHEDULE) {
    let group = groups.find(g => g.dayName === entry.dayName)
    if (!group) {
      group = { dayName: entry.dayName, events: [] }
      groups.push(group)
    }
    group.events.push(entry)
  }
  return groups
})

onMounted(() => {
  eventsStore.fetchEvents()
})

// Dynamic Event structured data — unlike the site-wide static LocalBusiness
// JSON-LD in index.html, this genuinely needs to reflect live store data.
const parseEventDateTime = (dateStr: string, timeStr: string): string | null => {
  const parsed = new Date(`${dateStr} ${timeStr}`)
  return isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

const eventsJsonLd = computed(() =>
  eventsStore.upcomingEvents.map(event => ({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    startDate: parseEventDateTime(event.date, event.time) ?? undefined,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      name: STORE_INFO.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: STORE_INFO.address.line1,
        addressLocality: STORE_INFO.address.city,
        addressRegion: STORE_INFO.address.state,
        postalCode: STORE_INFO.address.zip,
      },
    },
    offers: {
      '@type': 'Offer',
      price: event.entry,
      priceCurrency: 'USD',
      url: `${SITE_URL}/events`,
    },
    description: event.description,
  }))
)

useHead(() => ({
  script:
    eventsJsonLd.value.length > 0
      ? [{ type: 'application/ld+json', innerHTML: JSON.stringify(eventsJsonLd.value) }]
      : [],
}))

// Color map for known game type IDs
const gameTypeBadgeClass = (gameTypeId?: string): string => {
  switch (gameTypeId) {
    case 'magic':
      return 'bg-outpost-navy/10 text-outpost-navy'
    case 'pokemon':
      return 'bg-yellow-100 text-yellow-800'
    case 'one-piece':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}
</script>

<style scoped>
.hero-content {
  animation: fadeInUp 0.8s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translate3d(0, 30px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

.event-card {
  position: relative;
  animation: fadeInUp 0.6s ease-out both;
}

.special-event-item {
  animation: fadeInUp 0.5s ease-out both;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
