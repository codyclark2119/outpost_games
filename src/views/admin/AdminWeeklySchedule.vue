<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="container mx-auto px-4">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="flex flex-wrap justify-between items-center mb-8 gap-4">
          <div>
            <h1 class="font-cinzel text-4xl font-bold text-gray-800">Weekly Schedule</h1>
            <p class="text-gray-600 mt-1">
              Hide one occurrence of a recurring event — for a cancellation, or when a special event
              overrides that day. The recurring slot itself keeps running every other week.
            </p>
          </div>
          <router-link :to="{ name: 'AdminDashboard' }" class="btn-secondary px-4 py-2">
            ← Dashboard
          </router-link>
        </div>

        <!-- Error -->
        <div v-if="overridesStore.error" class="card text-center py-10">
          <p class="text-red-600 mb-4">{{ overridesStore.error }}</p>
          <button class="btn-primary px-6 py-2" @click="overridesStore.fetchOverrides()">
            Retry
          </button>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="entry in scheduleWithStatus"
            :key="entry.id"
            class="bg-white rounded-xl shadow border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4"
            :class="{ 'opacity-60': entry.override }"
          >
            <!-- Day badge -->
            <div
              class="flex-shrink-0 bg-outpost-navy text-white rounded-lg px-4 py-3 text-center min-w-[90px]"
            >
              <div class="text-xs uppercase tracking-wide opacity-70">Next</div>
              <div class="font-cinzel font-bold text-sm leading-tight">
                {{ entry.dayName }}
              </div>
              <div class="text-xs opacity-70">{{ entry.nextDateLabel }}</div>
            </div>

            <!-- Details -->
            <div class="flex-grow min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="font-cinzel font-bold text-lg text-gray-800">{{ entry.eventName }}</h3>
                <span
                  v-if="entry.override"
                  class="inline-block text-xs px-2 py-0.5 rounded-full font-medium bg-gray-200 text-gray-600"
                >
                  Hidden for {{ entry.nextDateLabel }}
                </span>
              </div>
              <p class="text-gray-600 text-sm mt-0.5">{{ entry.time }} · {{ entry.gameType }}</p>
              <p v-if="entry.override?.reason" class="text-gray-500 text-sm mt-1 italic">
                "{{ entry.override.reason }}"
              </p>
            </div>

            <!-- Action -->
            <div class="flex-shrink-0">
              <button
                v-if="!entry.override"
                class="px-4 py-1.5 bg-outpost-navy text-white rounded-lg hover:bg-outpost-navy-light text-sm font-medium transition-colors whitespace-nowrap"
                :disabled="overridesStore.loading"
                @click="openHideModal(entry)"
              >
                Hide for {{ entry.nextDateLabel }}
              </button>
              <button
                v-else
                class="px-4 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 text-sm font-medium transition-colors whitespace-nowrap"
                :disabled="overridesStore.loading"
                @click="restoreOccurrence(entry.override)"
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Hide-occurrence modal -->
    <teleport to="body">
      <transition name="modal-fade">
        <div
          v-if="hideModal.open"
          class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          @click.self="closeHideModal"
        >
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" @click.stop>
            <h2 class="font-cinzel text-lg font-bold mb-2 text-gray-800">
              Hide "{{ hideModal.eventName }}"?
            </h2>
            <p class="text-gray-600 text-sm mb-4">
              This hides only the {{ hideModal.nextDateLabel }} occurrence. The recurring
              {{ hideModal.dayName }} slot keeps running every other week.
            </p>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Reason <span class="text-gray-400">(optional)</span></label
            >
            <textarea
              v-model="hideModal.reason"
              rows="2"
              class="input-field resize-none mb-4"
              placeholder="e.g. Holiday closure, special event that day"
            ></textarea>
            <div v-if="hideError" class="text-red-600 text-sm mb-3">{{ hideError }}</div>
            <div class="flex gap-3 justify-end">
              <button class="btn-secondary px-5 py-2" @click="closeHideModal">Cancel</button>
              <button
                class="bg-red-500 hover:bg-red-600 text-white font-semibold px-5 py-2 rounded-lg transition-colors"
                :disabled="overridesStore.loading"
                @click="confirmHide"
              >
                {{ overridesStore.loading ? 'Hiding…' : 'Hide Occurrence' }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import { WEEKLY_SCHEDULE, type WeeklyScheduleEntry } from '../../config/weeklySchedule'
import { nextOccurrenceOf, toISODate } from '../../utils/weeklySchedule'
import { useWeeklyOverridesStore, type WeeklyOverride } from '../../stores/weeklyOverrides'

const overridesStore = useWeeklyOverridesStore()

interface ScheduleEntryWithStatus extends WeeklyScheduleEntry {
  nextDateISO: string
  nextDateLabel: string
  override: WeeklyOverride | undefined
}

const scheduleWithStatus = computed((): ScheduleEntryWithStatus[] =>
  WEEKLY_SCHEDULE.map(entry => {
    const nextDate = nextOccurrenceOf(entry.jsDay)
    const nextDateISO = toISODate(nextDate)
    return {
      ...entry,
      nextDateISO,
      nextDateLabel: nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      override: overridesStore.overrides.find(
        o => o.weeklyEventId === entry.id && o.date === nextDateISO
      ),
    }
  })
)

// ── Hide modal ────────────────────────────────────────────────────────────────
const hideModal = reactive({
  open: false,
  weeklyEventId: '',
  eventName: '',
  dayName: '',
  nextDateISO: '',
  nextDateLabel: '',
  reason: '',
})
const hideError = ref('')

const openHideModal = (entry: ScheduleEntryWithStatus) => {
  hideModal.weeklyEventId = entry.id
  hideModal.eventName = entry.eventName
  hideModal.dayName = entry.dayName
  hideModal.nextDateISO = entry.nextDateISO
  hideModal.nextDateLabel = entry.nextDateLabel
  hideModal.reason = ''
  hideError.value = ''
  hideModal.open = true
}

const closeHideModal = () => {
  hideModal.open = false
}

const confirmHide = async () => {
  hideError.value = ''
  try {
    await overridesStore.addOverride({
      weeklyEventId: hideModal.weeklyEventId,
      date: hideModal.nextDateISO,
      ...(hideModal.reason.trim() && { reason: hideModal.reason.trim() }),
    })
    closeHideModal()
  } catch (e) {
    hideError.value = e instanceof Error ? e.message : 'Failed to hide this occurrence'
  }
}

// ── Restore ───────────────────────────────────────────────────────────────────
const restoreOccurrence = async (override: WeeklyOverride | undefined) => {
  if (!override) return
  await overridesStore.removeOverride(override.id).catch(() => {})
}

onMounted(() => {
  overridesStore.fetchOverrides()
})
</script>

<style scoped>
.input-field {
  width: 100%;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  transition:
    box-shadow 0.15s,
    border-color 0.15s;
}
.input-field:focus {
  outline: none;
  border-color: transparent;
  box-shadow: 0 0 0 2px #16304a;
}
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
