<template>
  <!-- The next special event, big enough to notice on a phone without
       scrolling to the calendar. Renders nothing when none is coming up. -->
  <section v-if="next" class="page-shell pt-8 sm:pt-12" aria-labelledby="next-event-title">
    <div
      class="relative overflow-hidden rounded-3xl bg-outpost-navy p-5 text-white shadow-lg sm:p-8"
    >
      <div
        class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.22),transparent_60%)]"
        aria-hidden="true"
      ></div>
      <div class="relative">
        <p class="text-xs font-semibold tracking-[0.16em] text-outpost-gold uppercase">
          Next big event · {{ countdown }}
        </p>
        <div class="mt-3 flex items-start gap-4">
          <div
            class="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-white text-outpost-navy"
            aria-hidden="true"
          >
            <span class="text-[11px] font-semibold tracking-wider uppercase">
              {{ parts.month }}
            </span>
            <span class="font-display text-2xl leading-none font-bold">{{ parts.day }}</span>
          </div>
          <div class="min-w-0">
            <h2
              id="next-event-title"
              class="font-display text-2xl leading-tight font-bold text-balance sm:text-3xl"
            >
              {{ next.title }}
            </h2>
            <p class="mt-1 text-sm text-slate-200">
              {{ parts.weekday }} · {{ next.time }} · {{ entryLabel(next.entry) }}
              <template v-if="next.gameTypeName"> · {{ next.gameTypeName }}</template>
            </p>
          </div>
        </div>
        <p v-if="next.description" class="mt-4 line-clamp-2 max-w-2xl text-slate-200">
          {{ next.description }}
        </p>
        <div class="mt-5 grid gap-3 sm:flex sm:flex-wrap">
          <router-link :to="eventPath(next.id)" class="btn-primary py-3">
            See details
            <ArrowRightIcon class="h-4 w-4" aria-hidden="true" />
          </router-link>
          <EventActions :event="next" on-dark />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRightIcon } from '@heroicons/vue/24/outline'
import EventActions from './EventActions.vue'
import type { SpecialEvent } from '../stores/events'
import { addDaysToISODate, getStoreTodayISO, storeDateParts } from '../utils/eventDateTime'
import { entryLabel, eventPath, upcomingSpecials } from '../utils/eventLinks'

// Far enough ahead to give people time to plan around a prerelease, close
// enough that the spotlight never advertises something months away.
const LOOKAHEAD_DAYS = 45

const props = defineProps<{ events: SpecialEvent[]; now: Date }>()

const next = computed(() => {
  const limit = addDaysToISODate(getStoreTodayISO(props.now), LOOKAHEAD_DAYS)
  return upcomingSpecials(props.events, props.now).find(e => e.iso <= limit) ?? null
})
const parts = computed(() => storeDateParts(next.value?.iso ?? '1970-01-01'))

const countdown = computed(() => {
  if (!next.value) return ''
  const today = getStoreTodayISO(props.now)
  const days = Math.round(
    (Date.parse(`${next.value.iso}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000
  )
  return days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`
})
</script>
