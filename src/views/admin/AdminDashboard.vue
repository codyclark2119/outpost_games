<template>
  <AdminPage
    :title="auth.username ? `Hi, ${auth.username}` : 'Admin home'"
    subtitle="What do you need to do?"
    :back="false"
  >
    <!-- What's on this week, so the first screen answers "is tonight set up right?" -->
    <section class="mb-8" aria-labelledby="this-week">
      <div class="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="this-week" class="text-sm font-bold tracking-wide text-gray-500 uppercase">
          This week at the shop
        </h2>
        <router-link :to="{ name: 'AdminEvents' }" class="text-sm font-semibold text-outpost-navy">
          All events
        </router-link>
      </div>
      <p v-if="!agendaLoaded" class="rounded-2xl bg-white p-4 text-sm text-gray-500">Loading…</p>
      <AgendaList v-else-if="agenda.length" :days="agenda" />
      <div v-else class="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
        Nothing on the calendar for the next 7 days.
        <router-link
          :to="{ name: 'AdminEventsAdd' }"
          class="font-semibold text-outpost-navy underline"
          >Add an event</router-link
        >
      </div>
    </section>

    <section
      v-for="group in ADMIN_TASK_GROUPS"
      :key="group.heading"
      class="mb-8"
      :aria-labelledby="`group-${group.heading}`"
    >
      <h2
        :id="`group-${group.heading}`"
        class="mb-3 text-sm font-bold tracking-wide text-gray-500 uppercase"
      >
        {{ group.heading }}
      </h2>
      <ul class="grid gap-2 md:grid-cols-2">
        <li v-for="task in group.tasks" :key="task.routeName">
          <router-link
            :to="{ name: task.routeName }"
            class="flex min-h-16 items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-outpost-gold active:bg-gray-50"
          >
            <span
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-outpost-navy text-outpost-gold"
            >
              <component :is="task.icon" class="h-6 w-6" aria-hidden="true" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block font-semibold text-gray-900">{{ task.title }}</span>
              <span class="block text-sm text-gray-500">{{ task.hint }}</span>
            </span>
            <ChevronRightIcon class="h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
          </router-link>
        </li>
      </ul>
    </section>

    <router-link
      to="/"
      class="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-outpost-navy md:hidden"
    >
      <ArrowTopRightOnSquareIcon class="h-5 w-5" aria-hidden="true" />
      View the public site
    </router-link>
  </AdminPage>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ChevronRightIcon, ArrowTopRightOnSquareIcon } from '@heroicons/vue/24/outline'
import AdminPage from '../../components/admin/AdminPage.vue'
import AgendaList from '../../components/AgendaList.vue'
import { ADMIN_TASK_GROUPS } from '../../config/adminNav'
import { WEEKLY_SCHEDULE } from '../../config/weeklySchedule'
import { useAuthStore } from '../../stores/auth'
import { useEventsStore } from '../../stores/events'
import { useWeeklyOverridesStore } from '../../stores/weeklyOverrides'
import { getAgenda } from '../../utils/eventOccurrences'

const auth = useAuthStore()
const eventsStore = useEventsStore()
const overridesStore = useWeeklyOverridesStore()

const agendaLoaded = ref(false)
const agenda = computed(() =>
  getAgenda(eventsStore.upcomingEvents, WEEKLY_SCHEDULE, overridesStore.overrides, { days: 7 })
)

onMounted(async () => {
  // Either list failing still leaves a useful agenda (weekly nights alone, or
  // specials without overrides), so neither blocks the other.
  await Promise.allSettled([eventsStore.fetchEvents(), overridesStore.fetchOverrides()])
  agendaLoaded.value = true
})
</script>
