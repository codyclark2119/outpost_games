<template>
  <ol
    class="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white"
  >
    <li v-for="day in days" :key="day.dateISO" class="flex gap-4 p-4">
      <div
        class="flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-xl"
        :class="
          day.relative === 'Today' ? 'bg-outpost-navy text-white' : 'bg-slate-100 text-slate-700'
        "
        :aria-label="`${storeDateParts(day.dateISO).weekday} ${storeDateParts(day.dateISO).month} ${storeDateParts(day.dateISO).day}`"
      >
        <span class="text-[10px] font-semibold tracking-wider uppercase opacity-80">
          {{ storeDateParts(day.dateISO).weekday }}
        </span>
        <span class="text-lg leading-none font-bold">{{ storeDateParts(day.dateISO).day }}</span>
      </div>

      <div class="min-w-0 flex-1">
        <p
          v-if="day.relative"
          class="mb-1 text-xs font-semibold tracking-wide text-outpost-gold-text uppercase"
        >
          {{ day.relative }}
        </p>
        <ul class="space-y-3">
          <li v-for="event in day.events" :key="event.key">
            <p class="font-semibold text-slate-800">
              <router-link
                v-if="event.eventId"
                :to="eventPath(event.eventId)"
                class="underline decoration-slate-300 underline-offset-2 hover:decoration-outpost-navy"
                >{{ event.title }}</router-link
              >
              <template v-else>{{ event.title }}</template>
              <span
                v-if="!event.isWeekly"
                class="ml-1 inline-block rounded-full bg-outpost-gold/15 px-2 py-0.5 align-middle text-[11px] font-semibold text-outpost-gold-text"
              >
                Special
              </span>
            </p>
            <p class="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
              <span class="font-semibold text-outpost-navy tabular-nums">{{ event.time }}</span>
              <!-- No "·" separators: on a narrow phone they end up dangling at the
                   start or end of a wrapped line. The game's color dot does the job. -->
              <span v-if="event.gameTypeName" class="inline-flex items-center gap-1.5">
                <span
                  class="h-2 w-2 rounded-full"
                  :style="{
                    backgroundColor: gameMeta(event.gameTypeId ?? '', event.gameTypeName).accent,
                  }"
                  aria-hidden="true"
                ></span>
                {{ event.gameTypeName }}
              </span>
              <span v-if="!event.isWeekly && event.entry">{{ entryLabel(event.entry) }}</span>
            </p>
            <p
              v-if="detailed && !event.isWeekly && event.description"
              class="mt-1.5 text-sm text-slate-600"
            >
              {{ event.description }}
            </p>
          </li>
        </ul>
      </div>
    </li>
  </ol>
</template>

<script setup lang="ts">
import type { AgendaDay } from '../utils/eventOccurrences'
import { storeDateParts } from '../utils/eventDateTime'
import { gameMeta } from '../config/games'
import { entryLabel, eventPath } from '../utils/eventLinks'

// detailed: also show special events' descriptions (Events page; Home stays
// terse). Weekly nights are described once, in the Events page's weekly list.
defineProps<{ days: AgendaDay[]; detailed?: boolean }>()
</script>
