<template>
  <div class="pb-14">
    <div class="page-shell pt-6 sm:pt-10">
      <router-link to="/events" class="text-link">
        <ArrowLeftIcon class="h-4 w-4" aria-hidden="true" />
        All events
      </router-link>
    </div>

    <div
      v-if="!loaded"
      class="page-shell mt-6 h-72 animate-pulse rounded-2xl bg-slate-200/60"
      role="status"
      aria-label="Loading event"
    ></div>

    <div v-else-if="eventsStore.error && !event" class="page-shell mt-6">
      <p class="text-slate-600" role="status">
        Event details are temporarily unavailable.
        <button type="button" class="font-semibold underline" @click="load">Try again</button>
      </p>
    </div>

    <!-- Unknown, hidden, or already finished: point people somewhere useful. -->
    <div v-else-if="!event || finished" class="page-shell mt-6">
      <div class="card text-center">
        <h1 class="font-display text-2xl font-bold text-outpost-navy">
          {{
            event && finished ? `${event.title} has wrapped up` : "This event isn't on the calendar"
          }}
        </h1>
        <p class="mt-2 text-slate-600">
          See what's coming up next, or join our Discord for announcements.
        </p>
        <div class="mt-5 flex flex-wrap justify-center gap-3">
          <router-link to="/events" class="btn-primary">See upcoming events</router-link>
          <a
            :href="STORE_INFO.social.discord"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-secondary"
          >
            Join our Discord
          </a>
        </div>
      </div>
    </div>

    <article v-else class="page-shell mt-4">
      <div class="flex items-start gap-4">
        <div
          class="flex h-20 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-outpost-navy text-white"
          aria-hidden="true"
        >
          <span class="text-xs font-semibold tracking-wider uppercase opacity-80">
            {{ parts.month }}
          </span>
          <span class="font-display text-3xl leading-none font-bold">{{ parts.day }}</span>
        </div>
        <div class="min-w-0">
          <p v-if="event.gameTypeName" class="eyebrow inline-flex items-center gap-1.5">
            <span
              class="h-2 w-2 rounded-full"
              :style="{
                backgroundColor: gameMeta(event.gameTypeId ?? '', event.gameTypeName).accent,
              }"
              aria-hidden="true"
            ></span>
            {{ event.gameTypeName }}
          </p>
          <h1
            class="mt-1 font-display text-3xl leading-tight font-bold tracking-tight text-balance text-outpost-navy sm:text-4xl"
          >
            {{ event.title }}
          </h1>
        </div>
      </div>

      <dl class="mt-6 grid gap-3 sm:grid-cols-3">
        <div class="rounded-2xl border border-slate-200 bg-white p-4">
          <dt class="text-xs font-semibold tracking-wide text-slate-500 uppercase">When</dt>
          <dd class="mt-1 font-semibold text-slate-800">
            {{ dayLabel }}
            <span class="block font-normal text-slate-600">Starts {{ event.time }}</span>
          </dd>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-4">
          <dt class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Entry</dt>
          <dd class="mt-1 font-semibold text-slate-800">
            {{ Number(event.entry) > 0 ? `$${Number(event.entry)}` : 'Free' }}
          </dd>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-4">
          <dt class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Where</dt>
          <dd class="mt-1 text-slate-800">
            <a
              :href="STORE_INFO.mapsUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="font-semibold underline decoration-slate-300 underline-offset-2"
            >
              {{ STORE_INFO.name }}
            </a>
            <span class="block text-slate-600">{{ STORE_INFO.address.line1 }}</span>
          </dd>
        </div>
      </dl>

      <p v-if="event.description" class="mt-6 max-w-2xl whitespace-pre-line text-slate-700">
        {{ event.description }}
      </p>

      <EventActions :event="event" class="mt-6" />

      <p class="mt-8 max-w-2xl rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
        Sign-ups, pairings, and announcements happen on
        <a
          :href="STORE_INFO.social.discord"
          target="_blank"
          rel="noopener noreferrer"
          class="font-semibold text-outpost-navy underline"
          >our Discord</a
        >.
      </p>
    </article>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import { useNow } from '@vueuse/core'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'
import EventActions from '../components/EventActions.vue'
import { useEventsStore } from '../stores/events'
import { STORE_INFO } from '../config/storeInfo'
import { gameMeta } from '../config/games'
import { SITE_URL } from '../composables/usePageMeta'
import {
  eventDateToISO,
  eventStartISO,
  formatStoreDateLabel,
  hasEventStarted,
  storeDateParts,
} from '../utils/eventDateTime'
import { entryLabel, eventPath } from '../utils/eventLinks'

const route = useRoute()
const eventsStore = useEventsStore()
const now = useNow({ interval: 60_000 })
const loaded = ref(false)

const id = computed(() => String(route.params.id ?? ''))
// Drafts (hidden events) are treated as missing on the public site.
const event = computed(
  () => eventsStore.upcomingEvents.find(e => e.id === id.value && e.isVisible !== false) ?? null
)
const iso = computed(() => (event.value ? eventDateToISO(event.value.date) : null))
const finished = computed(
  () => !iso.value || hasEventStarted(iso.value, event.value!.time, now.value)
)
const parts = computed(() => storeDateParts(iso.value ?? '1970-01-01'))
const dayLabel = computed(() => (iso.value ? formatStoreDateLabel(iso.value) : ''))

const load = async () => {
  await eventsStore.fetchEvents()
  loaded.value = true
}
onMounted(load)

const pageUrl = computed(() => `${SITE_URL}${eventPath(id.value)}`)
const metaTitle = computed(() =>
  event.value ? `${event.value.title} — The Outpost Games` : 'Event — The Outpost Games'
)
const metaDescription = computed(() =>
  event.value
    ? `${dayLabel.value} at ${event.value.time} · ${entryLabel(event.value.entry)}. ${event.value.description}`.slice(
        0,
        300
      )
    : 'Tournaments and events at The Outpost Games in Rio Grande City, TX.'
)

useHead(() => ({
  title: metaTitle.value,
  meta: [
    { name: 'description', content: metaDescription.value },
    { property: 'og:title', content: metaTitle.value },
    { property: 'og:description', content: metaDescription.value },
    { property: 'og:url', content: pageUrl.value },
  ],
  link: [{ rel: 'canonical', href: pageUrl.value }],
  script:
    event.value && !finished.value
      ? [
          {
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Event',
              name: event.value.title,
              startDate: eventStartISO(event.value.date, event.value.time) ?? undefined,
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
                price: event.value.entry,
                priceCurrency: 'USD',
                url: pageUrl.value,
              },
              description: event.value.description,
            }),
          },
        ]
      : [],
}))
</script>
