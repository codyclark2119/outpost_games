<template>
  <AdminPage title="Events" subtitle="Change, hide, or remove special events.">
    <template #actions>
      <router-link
        :to="{ name: 'AdminEventsAdd' }"
        class="btn-primary flex-1 px-4 py-3 sm:flex-none"
      >
        + Add an event
      </router-link>
      <router-link
        :to="{ name: 'AdminWeeklySchedule' }"
        class="btn-secondary flex-1 px-4 py-3 sm:flex-none"
      >
        Skip a weekly night
      </router-link>
    </template>

    <div
      v-if="eventsStore.loading && eventsStore.upcomingEvents.length === 0"
      class="py-16 text-center"
      role="status"
    >
      <div
        class="inline-block h-10 w-10 animate-spin rounded-full border-b-2 border-outpost-gold"
      ></div>
      <p class="mt-4 text-gray-600">Loading events…</p>
    </div>

    <template v-else>
      <!-- A failed save shows here, above the list, instead of replacing it. -->
      <div
        v-if="eventsStore.error"
        class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
        role="alert"
      >
        <p class="text-sm text-red-700">{{ eventsStore.error }}</p>
        <button type="button" class="btn-secondary px-4 py-2" @click="eventsStore.fetchEvents()">
          Try again
        </button>
      </div>

      <h2 class="mb-3 text-sm font-bold tracking-wide text-gray-500 uppercase">
        Coming up ({{ upcoming.length }})
      </h2>

      <div v-if="upcoming.length === 0" class="card py-10 text-center">
        <p class="mb-4 text-gray-500">No special events coming up.</p>
        <router-link :to="{ name: 'AdminEventsAdd' }" class="btn-primary px-6 py-3">
          Add an event
        </router-link>
      </div>

      <ul v-else class="space-y-3">
        <li
          v-for="event in upcoming"
          :key="event.id"
          class="rounded-2xl border bg-white p-4 shadow-sm"
          :class="event.isVisible === false ? 'border-dashed border-gray-300' : 'border-gray-200'"
        >
          <div class="flex gap-4">
            <div
              class="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-xl text-white"
              :class="event.isVisible === false ? 'bg-gray-400' : 'bg-outpost-navy'"
            >
              <span class="text-xs uppercase opacity-80">{{ monthOf(event.date) }}</span>
              <span class="font-display text-2xl leading-none font-bold">{{
                dayOf(event.date)
              }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="font-semibold text-gray-900">{{ event.title }}</h3>
              <p class="text-sm text-gray-600">
                {{ weekdayOf(event.date) }} · {{ event.time }} · {{ feeLabel(event.entry) }}
              </p>
              <p
                class="mt-1 inline-flex items-center gap-1 text-xs font-semibold"
                :class="event.isVisible === false ? 'text-gray-500' : 'text-green-700'"
              >
                <component
                  :is="event.isVisible === false ? EyeSlashIcon : EyeIcon"
                  class="h-4 w-4"
                  aria-hidden="true"
                />
                {{
                  event.isVisible === false ? 'Hidden from the website' : 'Showing on the website'
                }}
              </p>
            </div>
          </div>
          <div class="mt-4 grid grid-cols-3 gap-2">
            <button type="button" class="action-btn" @click="openEdit(event)">Edit</button>
            <button
              type="button"
              class="action-btn"
              :disabled="busyId === event.id"
              @click="toggleVisibility(event)"
            >
              {{ event.isVisible === false ? 'Show' : 'Hide' }}
            </button>
            <button type="button" class="action-btn danger" @click="remove(event)">Delete</button>
          </div>
        </li>
      </ul>

      <details v-if="past.length" class="mt-10">
        <summary
          class="flex min-h-11 cursor-pointer items-center text-sm font-bold tracking-wide text-gray-500 uppercase"
        >
          Past events ({{ past.length }})
        </summary>
        <p class="mt-1 mb-3 text-sm text-gray-500">Kept for your records until you delete them.</p>
        <ul class="space-y-2">
          <li
            v-for="event in past"
            :key="event.id"
            class="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3"
          >
            <div class="min-w-0">
              <p class="truncate font-semibold text-gray-800">{{ event.title }}</p>
              <p class="text-sm text-gray-500">{{ event.date }}</p>
            </div>
            <div class="flex shrink-0 gap-2">
              <button type="button" class="action-btn px-3" @click="openEdit(event)">Edit</button>
              <button type="button" class="action-btn danger px-3" @click="remove(event)">
                Delete
              </button>
            </div>
          </li>
        </ul>
      </details>
    </template>

    <AdminDialog :open="editing !== null" title="Edit event" @close="editing = null">
      <div class="p-5 sm:p-6">
        <h2 class="mb-5 font-display text-xl font-bold text-gray-800">Edit event</h2>
        <EventForm
          ref="formRef"
          :event="editing"
          submit-label="Save changes"
          cancel-label="Cancel"
          :saving="saving"
          @submit="saveEdit"
          @cancel="editing = null"
        />
      </div>
    </AdminDialog>
  </AdminPage>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import AdminPage from '../../components/admin/AdminPage.vue'
import AdminDialog from '../../components/admin/AdminDialog.vue'
import EventForm, { type EventPayload } from '../../components/admin/EventForm.vue'
import { useConfirmation } from '../../composables/useConfirmation'
import { useEventsStore, type SpecialEvent } from '../../stores/events'
import { useSquareCatalogStore } from '../../stores/squareCatalog'
import { eventDateToISO, getStoreTodayISO } from '../../utils/eventDateTime'

const eventsStore = useEventsStore()
const catalogStore = useSquareCatalogStore()
const { ask } = useConfirmation()

const parts = (date: string, opts: Intl.DateTimeFormatOptions) => {
  const iso = eventDateToISO(date)
  return iso
    ? new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' })
    : '—'
}
const monthOf = (date: string) => parts(date, { month: 'short' })
const dayOf = (date: string) => parts(date, { day: 'numeric' })
const weekdayOf = (date: string) => parts(date, { weekday: 'long' })
const feeLabel = (entry: string) => (Number(entry) ? `$${Number(entry)} entry` : 'Free')

const sorted = computed(() =>
  eventsStore.upcomingEvents
    .map(e => ({ e, iso: eventDateToISO(e.date) }))
    .filter((x): x is { e: SpecialEvent; iso: string } => x.iso !== null)
    .sort((a, b) => a.iso.localeCompare(b.iso))
)
const todayISO = computed(() => getStoreTodayISO())
const upcoming = computed(() => sorted.value.filter(x => x.iso >= todayISO.value).map(x => x.e))
const past = computed(() =>
  sorted.value
    .filter(x => x.iso < todayISO.value)
    .map(x => x.e)
    .reverse()
)

// ── Edit ──────────────────────────────────────────────────────────────────────
const editing = ref<SpecialEvent | null>(null)
const formRef = ref<InstanceType<typeof EventForm> | null>(null)
const saving = ref(false)

const openEdit = (event: SpecialEvent) => {
  editing.value = event
}

const saveEdit = async (payload: EventPayload) => {
  if (!editing.value || saving.value) return
  saving.value = true
  try {
    await eventsStore.updateEvent(editing.value.id, payload)
    editing.value = null
  } catch (e) {
    formRef.value?.setError(e instanceof Error ? e.message : 'The changes could not be saved.')
  } finally {
    saving.value = false
  }
}

// ── Show / hide ───────────────────────────────────────────────────────────────
const busyId = ref<string | null>(null)
const toggleVisibility = async (event: SpecialEvent) => {
  busyId.value = event.id
  try {
    await eventsStore.updateEvent(event.id, { isVisible: event.isVisible === false })
  } catch {
    // The store's error banner above the list explains what went wrong.
  } finally {
    busyId.value = null
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
const remove = async (event: SpecialEvent) => {
  const ok = await ask(
    `Delete “${event.title}” for good? To take it off the website but keep it, use Hide instead.`
  )
  if (!ok) return
  await eventsStore.deleteEvent(event.id).catch(() => {})
}

onMounted(async () => {
  await eventsStore.fetchEvents()
  await catalogStore.ensureCatalog()
})
</script>

<style scoped>
.action-btn {
  min-height: 2.75rem;
  border-radius: 0.5rem;
  border: 1px solid #d1d5db;
  background: #fff;
  padding: 0 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #16304a;
}
.action-btn:hover {
  background: #f3f4f6;
}
.action-btn:disabled {
  opacity: 0.5;
}
.action-btn.danger {
  border-color: #fecaca;
  color: #b91c1c;
}
.action-btn.danger:hover {
  background: #fef2f2;
}
</style>
