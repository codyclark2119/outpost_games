<template>
  <AdminPage
    title="Skip a weekly night"
    subtitle="Tap a date to cancel that one week, for a holiday or when a special event takes the night. Every other week keeps running as normal."
    :back="{ to: { name: 'AdminEvents' }, label: 'All events' }"
  >
    <p v-if="!loaded" class="py-10 text-center text-gray-600" role="status">Loading schedule…</p>
    <div
      v-else-if="overridesStore.error && !overridesStore.overrides.length"
      class="card py-10 text-center"
    >
      <p class="mb-4 text-red-600">{{ overridesStore.error }}</p>
      <button class="btn-primary px-6 py-3" @click="overridesStore.fetchOverrides()">
        Try again
      </button>
    </div>

    <ul v-else class="space-y-3">
      <li
        v-for="entry in schedule"
        :key="entry.id"
        class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
      >
        <h2 class="font-semibold text-gray-900">{{ entry.eventName }}</h2>
        <p class="text-sm text-gray-600">Every {{ entry.dayName }} · {{ entry.time }}</p>
        <ul class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <li v-for="night in entry.nights" :key="night.dateISO">
            <button
              type="button"
              class="flex min-h-14 w-full flex-col items-center justify-center rounded-xl border px-2 py-1.5 text-sm"
              :class="
                night.override
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-gray-200 bg-white text-gray-800 hover:border-outpost-gold'
              "
              :disabled="overridesStore.loading"
              :aria-label="
                night.override
                  ? `${night.label} is skipped. Tap to put it back on.`
                  : `Skip ${night.label}`
              "
              @click="night.override ? restore(night.override) : openSkip(entry, night)"
            >
              <span class="font-semibold">{{ night.label }}</span>
              <span class="text-xs">{{ night.override ? 'Skipped · undo' : 'On' }}</span>
            </button>
          </li>
        </ul>
        <p
          v-for="night in entry.nights.filter(n => n.override?.reason)"
          :key="`reason-${night.dateISO}`"
          class="mt-2 text-sm text-gray-500 italic"
        >
          {{ night.label }}: “{{ night.override!.reason }}”
        </p>
      </li>
    </ul>

    <AdminDialog :open="skipping !== null" title="Skip this night" @close="skipping = null">
      <div v-if="skipping" class="p-5 sm:p-6">
        <h2 class="mb-2 font-display text-lg font-bold text-gray-800">
          Skip {{ skipping.eventName }} on {{ skipping.label }}?
        </h2>
        <p class="mb-4 text-sm text-gray-600">
          It comes off the website for that date only. Every other {{ skipping.dayName }} stays on.
        </p>
        <label for="skip-reason" class="mb-1 block text-sm font-semibold text-gray-700">
          Reason <span class="font-normal text-gray-400">(optional, shown to admins only)</span>
        </label>
        <textarea
          id="skip-reason"
          v-model="reason"
          rows="2"
          class="input-field mb-4 resize-none"
          placeholder="e.g. Closed for the holiday"
        ></textarea>
        <p v-if="skipError" class="mb-3 text-sm text-red-600" role="alert">{{ skipError }}</p>
        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button class="btn-secondary px-5 py-3" @click="skipping = null">Cancel</button>
          <button
            class="rounded-lg bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800"
            :disabled="overridesStore.loading"
            @click="confirmSkip"
          >
            {{ overridesStore.loading ? 'Saving…' : 'Skip this night' }}
          </button>
        </div>
      </div>
    </AdminDialog>
  </AdminPage>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AdminPage from '../../components/admin/AdminPage.vue'
import AdminDialog from '../../components/admin/AdminDialog.vue'
import { WEEKLY_SCHEDULE, type WeeklyScheduleEntry } from '../../config/weeklySchedule'
import { nextOccurrenceOf, toISODate } from '../../utils/weeklySchedule'
import { addDaysToISODate } from '../../utils/eventDateTime'
import { useWeeklyOverridesStore, type WeeklyOverride } from '../../stores/weeklyOverrides'

// How many upcoming weeks can be skipped from here — far enough to plan a
// holiday month ahead, short enough to fit one row on a phone.
const WEEKS_AHEAD = 4

const overridesStore = useWeeklyOverridesStore()
const loaded = ref(false)

interface Night {
  dateISO: string
  label: string
  override: WeeklyOverride | undefined
}

const schedule = computed(() =>
  WEEKLY_SCHEDULE.map(entry => {
    const firstISO = toISODate(nextOccurrenceOf(entry.jsDay))
    const nights: Night[] = Array.from({ length: WEEKS_AHEAD }, (_, week) => {
      const dateISO = addDaysToISODate(firstISO, week * 7)
      return {
        dateISO,
        label: new Date(`${dateISO}T12:00:00Z`).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        }),
        override: overridesStore.overrides.find(
          o => o.weeklyEventId === entry.id && o.date === dateISO
        ),
      }
    })
    return { ...entry, nights }
  })
)

// ── Skip ──────────────────────────────────────────────────────────────────────
const skipping = ref<(Night & Pick<WeeklyScheduleEntry, 'id' | 'eventName' | 'dayName'>) | null>(
  null
)
const reason = ref('')
const skipError = ref('')

const openSkip = (entry: WeeklyScheduleEntry, night: Night) => {
  skipping.value = { ...night, id: entry.id, eventName: entry.eventName, dayName: entry.dayName }
  reason.value = ''
  skipError.value = ''
}

const confirmSkip = async () => {
  if (!skipping.value) return
  skipError.value = ''
  try {
    await overridesStore.addOverride({
      weeklyEventId: skipping.value.id,
      date: skipping.value.dateISO,
      ...(reason.value.trim() && { reason: reason.value.trim() }),
    })
    skipping.value = null
  } catch (e) {
    skipError.value = e instanceof Error ? e.message : 'That night could not be skipped.'
  }
}

// ── Undo ──────────────────────────────────────────────────────────────────────
const restore = async (override: WeeklyOverride) => {
  await overridesStore.removeOverride(override.id).catch(() => {})
}

onMounted(async () => {
  await overridesStore.fetchOverrides()
  loaded.value = true
})
</script>

<style scoped>
.input-field {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.9375rem;
}
.input-field:focus {
  outline: none;
  border-color: transparent;
  box-shadow: 0 0 0 2px #16304a;
}
</style>
