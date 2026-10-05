<template>
  <div class="pb-14">
    <PageHeader
      eyebrow="Events"
      title="Play with us"
      subtitle="League nights and tournaments every week. Sign-ups, pairings, and announcements happen on our Discord."
    >
      <a
        :href="STORE_INFO.social.discord"
        target="_blank"
        rel="noopener noreferrer"
        class="btn-primary mt-5"
      >
        <SocialIcon name="discord" class="h-5 w-5" />
        Join our Discord
      </a>
    </PageHeader>

    <div class="page-shell space-y-12">
      <!-- The next seven days: weekly nights and specials together, day by day -->
      <section>
        <h2 class="section-title">This week</h2>
        <div
          v-if="loading && !agenda.length"
          class="mt-4 h-64 animate-pulse rounded-2xl bg-slate-200/60"
          role="status"
          aria-label="Loading events"
        ></div>
        <p v-else-if="loadError" class="mt-4 text-slate-600" role="status">
          Event updates are temporarily unavailable.
          <button type="button" class="font-semibold underline" @click="reload">Try again</button>
        </p>
        <AgendaList v-else-if="agenda.length" :days="agenda" detailed class="mt-4" />
        <p v-else class="mt-4 text-slate-600">Nothing scheduled this week — check back soon.</p>
      </section>

      <!-- Specials beyond the agenda window -->
      <section v-if="laterSpecials.length">
        <h2 class="section-title">Later on</h2>
        <ul class="mt-4 grid gap-3 sm:grid-cols-2">
          <li
            v-for="event in laterSpecials"
            :key="event.id"
            class="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4"
          >
            <div
              class="flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-100 text-slate-700"
            >
              <span class="text-[10px] font-semibold tracking-wider uppercase opacity-80">
                {{ storeDateParts(event.iso).month }}
              </span>
              <span class="text-lg leading-none font-bold">
                {{ storeDateParts(event.iso).day }}
              </span>
            </div>
            <div class="min-w-0">
              <p class="font-semibold text-slate-800">{{ event.title }}</p>
              <p class="mt-0.5 text-xs text-slate-500">
                {{ storeDateParts(event.iso).weekday }} · {{ event.time }}
                <span v-if="event.entry"> · ${{ event.entry }} entry</span>
                <span v-if="event.gameTypeName"> · {{ event.gameTypeName }}</span>
              </p>
              <p v-if="event.description" class="mt-1.5 line-clamp-3 text-sm text-slate-600">
                {{ event.description }}
              </p>
            </div>
          </li>
        </ul>
      </section>

      <!-- The standing weekly schedule, for reference -->
      <section>
        <h2 class="section-title">Every week</h2>
        <p class="mt-1 text-slate-600">No signup required — just show up.</p>
        <dl
          class="mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white"
        >
          <div
            v-for="group in weeklyByDay"
            :key="group.dayName"
            class="grid gap-2 p-4 sm:grid-cols-[8rem_1fr] sm:gap-6"
          >
            <dt class="font-semibold text-outpost-navy">{{ group.dayName }}</dt>
            <dd class="space-y-2">
              <div
                v-for="entry in group.entries"
                :key="entry.id"
                class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
              >
                <span class="text-sm font-semibold text-slate-500 tabular-nums">{{
                  entry.time
                }}</span>
                <span class="font-medium text-slate-800">{{ entry.eventName }}</span>
                <span class="inline-flex items-center gap-1.5 text-xs text-slate-500">
                  <span
                    class="h-2 w-2 rounded-full"
                    :style="{ backgroundColor: gameMeta(entry.gameTypeId, entry.gameType).accent }"
                    aria-hidden="true"
                  ></span>
                  {{ entry.gameType }}
                </span>
                <span
                  v-if="isOffThisWeek(entry)"
                  class="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700"
                >
                  Off this week
                </span>
                <p class="w-full text-sm text-slate-600">{{ entry.description }}</p>
              </div>
            </dd>
          </div>
        </dl>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useHead } from '@unhead/vue'
import { useNow } from '@vueuse/core'
import { useEventsStore } from '../stores/events'
import { useWeeklyOverridesStore } from '../stores/weeklyOverrides'
import { WEEKLY_SCHEDULE, type WeeklyScheduleEntry } from '../config/weeklySchedule'
import { getAgenda } from '../utils/eventOccurrences'
import {
  addDaysToISODate,
  eventDateToISO,
  eventStartISO,
  getStoreTodayISO,
  hasEventStarted,
  storeDateParts,
} from '../utils/eventDateTime'
import { nextOccurrenceOf, toISODate } from '../utils/weeklySchedule'
import { usePageMeta, SITE_URL } from '../composables/usePageMeta'
import { STORE_INFO } from '../config/storeInfo'
import { gameMeta } from '../config/games'
import PageHeader from '../components/PageHeader.vue'
import AgendaList from '../components/AgendaList.vue'
import SocialIcon from '../components/SocialIcon.vue'

usePageMeta({
  title: 'Events & Tournaments — The Outpost Games',
  description:
    'Weekly tournaments and special events at The Outpost Games in Rio Grande City, TX — Magic: The Gathering, Pokémon, One Piece, Gundam, and Riftbound.',
  path: '/events',
})

// One week: the recurring nights would otherwise repeat in a second week that
// "Every week" below already covers; specials beyond it land in "Later on".
const AGENDA_DAYS = 7

const eventsStore = useEventsStore()
const weeklyOverridesStore = useWeeklyOverridesStore()
const now = useNow({ interval: 60_000 })

const loading = computed(() => eventsStore.loading || weeklyOverridesStore.loading)
const loadError = computed(() => eventsStore.error || weeklyOverridesStore.error)
const reload = () => {
  eventsStore.fetchEvents()
  weeklyOverridesStore.fetchOverrides()
}

const agenda = computed(() =>
  getAgenda(eventsStore.upcomingEvents, WEEKLY_SCHEDULE, weeklyOverridesStore.overrides, {
    days: AGENDA_DAYS,
    now: now.value,
  })
)

// Visible specials that haven't started yet, soonest first. The store's
// upcomingEvents is the raw list, so finished events are dropped here.
const upcomingSpecials = computed(() =>
  eventsStore.upcomingEvents
    .filter(event => event.isVisible !== false)
    .map(event => ({ ...event, iso: eventDateToISO(event.date) }))
    .filter((event): event is typeof event & { iso: string } =>
      Boolean(event.iso && !hasEventStarted(event.iso, event.time, now.value))
    )
    .sort((a, b) => a.iso.localeCompare(b.iso))
)

// The ones beyond the agenda window, which the agenda itself doesn't show.
const laterSpecials = computed(() => {
  const windowEndISO = addDaysToISODate(getStoreTodayISO(now.value), AGENDA_DAYS)
  return upcomingSpecials.value.filter(event => event.iso >= windowEndISO)
})

// A weekly entry hidden (via an admin override) on its next occurrence.
const isOffThisWeek = (entry: WeeklyScheduleEntry) => {
  const nextISO = toISODate(nextOccurrenceOf(entry.jsDay, now.value))
  return weeklyOverridesStore.overrides.some(
    o => o.weeklyEventId === entry.id && o.date === nextISO
  )
}

// Same-day entries (e.g. Friday's FNM + Pokémon) grouped under one day row,
// in WEEKLY_SCHEDULE's own order.
const weeklyByDay = computed(() => {
  const groups: { dayName: string; entries: WeeklyScheduleEntry[] }[] = []
  for (const entry of WEEKLY_SCHEDULE) {
    let group = groups.find(g => g.dayName === entry.dayName)
    if (!group) {
      group = { dayName: entry.dayName, entries: [] }
      groups.push(group)
    }
    group.entries.push(entry)
  }
  return groups
})

onMounted(reload)

// Dynamic Event structured data for upcoming specials — unlike the site-wide
// static LocalBusiness JSON-LD in index.html, this reflects live store data.
const eventsJsonLd = computed(() =>
  upcomingSpecials.value.map(event => ({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    startDate: eventStartISO(event.date, event.time) ?? undefined,
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
</script>
