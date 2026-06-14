<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="container mx-auto px-4">
      <div class="max-w-4xl mx-auto">

        <!-- Header -->
        <div class="flex flex-wrap justify-between items-center mb-8 gap-4">
          <div>
            <h1 class="font-cinzel text-4xl font-bold text-gray-800">Manage Events</h1>
            <p class="text-gray-600 mt-1">Edit, delete, and review upcoming events</p>
          </div>
          <div class="flex gap-3">
            <router-link to="/x/outpostAdmin/events/add" class="btn-primary px-4 py-2">
              + Add Event
            </router-link>
            <router-link to="/x/outpostAdmin" class="btn-secondary px-4 py-2">
              ← Dashboard
            </router-link>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="eventsStore.loading && eventsStore.upcomingEvents.length === 0" class="text-center py-16">
          <div class="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-outpost-gold"></div>
          <p class="mt-4 text-gray-600">Loading events…</p>
        </div>

        <!-- Error -->
        <div v-else-if="eventsStore.error" class="card-mtg text-center py-10">
          <p class="text-red-600 mb-4">{{ eventsStore.error }}</p>
          <button class="btn-primary px-6 py-2" @click="eventsStore.fetchEvents()">Retry</button>
        </div>

        <template v-else>
          <!-- Event count + reset -->
          <div class="flex justify-between items-center mb-4">
            <p class="text-gray-600 text-sm">
              {{ upcomingEventsFiltered.length }} upcoming event{{ upcomingEventsFiltered.length !== 1 ? 's' : '' }}
            </p>
            <button
              class="text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
              @click="resetEvents"
            >
              Reset to Defaults
            </button>
          </div>

          <!-- Empty state -->
          <div v-if="upcomingEventsFiltered.length === 0" class="card-mtg text-center py-12">
            <p class="text-gray-500 mb-4">No upcoming events.</p>
            <router-link to="/x/outpostAdmin/events/add" class="btn-primary px-6 py-2">
              Add First Event
            </router-link>
          </div>

          <!-- Events list -->
          <div v-else class="space-y-3">
            <div
              v-for="event in upcomingEventsFiltered"
              :key="event.id"
              class="bg-white rounded-xl shadow border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-start gap-4 hover:border-outpost-gold transition-colors"
            >
              <!-- Date badge -->
              <div class="flex-shrink-0 bg-outpost-navy text-white rounded-lg px-4 py-3 text-center min-w-[80px]">
                <div class="text-xs uppercase tracking-wide opacity-70">{{ monthOf(event.date) }}</div>
                <div class="font-cinzel font-bold text-2xl leading-none">{{ dayOf(event.date) }}</div>
                <div class="text-xs opacity-70">{{ yearOf(event.date) }}</div>
              </div>

              <!-- Details -->
              <div class="flex-grow min-w-0">
                <h3 class="font-cinzel font-bold text-lg text-gray-800">{{ event.title }}</h3>
                <p class="text-gray-600 text-sm mt-0.5">{{ event.time }} · Entry: ${{ event.entry }}</p>
                <p class="text-gray-500 text-sm mt-1 line-clamp-2">{{ event.description }}</p>
              </div>

              <!-- Actions -->
              <div class="flex gap-2 flex-shrink-0 sm:flex-col">
                <button
                  class="px-4 py-1.5 bg-outpost-navy text-white rounded-lg hover:bg-outpost-navy-light text-sm font-medium transition-colors"
                  @click="openEdit(event)"
                >
                  Edit
                </button>
                <button
                  class="px-4 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 text-sm font-medium transition-colors"
                  @click="confirmDelete(event)"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </template>

      </div>
    </div>

    <!-- Edit Modal -->
    <teleport to="body">
      <transition name="modal-fade">
        <div
          v-if="editModal.open"
          class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          @click.self="closeEdit"
        >
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" @click.stop>
            <div class="p-6">
              <h2 class="font-cinzel text-xl font-bold mb-5 text-gray-800">Edit Event</h2>

              <form class="space-y-4" @submit.prevent="saveEdit">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
                  <input v-model="editForm.title" type="text" required class="input-field" />
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input v-model="editForm.dateISO" type="date" required class="input-field" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <select v-model="editForm.time" required class="input-field">
                      <option v-for="t in timeOptions" :key="t" :value="t">{{ t }}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Entry Fee</label>
                  <select v-model="editForm.entry" required class="input-field">
                    <option v-for="fee in entryFeeOptions" :key="fee.value" :value="fee.value">{{ fee.label }}</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea v-model="editForm.description" required rows="3" class="input-field resize-none"></textarea>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Game Type (Optional)</label>
                  <select v-model="editForm.gameTypeId" class="input-field">
                    <option value="">No specific game type</option>
                    <option v-for="t in catalogTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
                    <option value="custom">Custom…</option>
                  </select>
                </div>
                <div v-if="editForm.gameTypeId === 'custom'">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Custom Game Type *</label>
                  <input v-model="editForm.customGameType" type="text" class="input-field" placeholder="e.g., Flesh and Blood" />
                </div>

                <div v-if="editError" class="text-red-600 text-sm">{{ editError }}</div>

                <div class="flex gap-3 justify-end pt-2">
                  <button type="button" class="btn-secondary px-5 py-2" @click="closeEdit">Cancel</button>
                  <button type="submit" class="btn-primary px-5 py-2" :disabled="saving">
                    {{ saving ? 'Saving…' : 'Save Changes' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </transition>
    </teleport>

    <!-- Delete confirm modal -->
    <teleport to="body">
      <transition name="modal-fade">
        <div
          v-if="deleteModal.open"
          class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          @click.self="deleteModal.open = false"
        >
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center" @click.stop>
            <h2 class="font-cinzel text-lg font-bold mb-2 text-gray-800">Delete Event?</h2>
            <p class="text-gray-600 text-sm mb-6">"{{ deleteModal.title }}" will be permanently removed.</p>
            <div class="flex gap-3 justify-center">
              <button class="btn-secondary px-5 py-2" @click="deleteModal.open = false">Cancel</button>
              <button
                class="bg-red-500 hover:bg-red-600 text-white font-semibold px-5 py-2 rounded-lg transition-colors"
                :disabled="saving"
                @click="executeDelete"
              >
                {{ saving ? 'Deleting…' : 'Delete' }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useEventsStore, type SpecialEvent } from '../../stores/events'
import { useProductsStore } from '../../stores/products'

const eventsStore = useEventsStore()
const productsStore = useProductsStore()

const catalogTypes = computed(() =>
  productsStore.catalog.types.filter(t => t.isVisible).sort((a, b) => a.sortOrder - b.sortOrder),
)

// ── Date helpers ──────────────────────────────────────────────────────────────
const parseEventDate = (dateString: string): Date => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return new Date(dateString + 'T12:00:00')
  const parsed = new Date(dateString)
  return isNaN(parsed.getTime()) ? new Date() : parsed
}

const monthOf = (date: string) =>
  parseEventDate(date).toLocaleDateString('en-US', { month: 'short' })
const dayOf = (date: string) =>
  parseEventDate(date).toLocaleDateString('en-US', { day: 'numeric' })
const yearOf = (date: string) =>
  parseEventDate(date).toLocaleDateString('en-US', { year: 'numeric' })

const formatDateToReadable = (isoDate: string): string =>
  new Date(isoDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

const parseReadableDateToISO = (readableDate: string): string => {
  const d = new Date(readableDate)
  return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0] ?? ''
}

// ── Filtered list ─────────────────────────────────────────────────────────────
const upcomingEventsFiltered = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return eventsStore.upcomingEvents.filter(e => {
    const d = parseEventDate(e.date)
    d.setHours(0, 0, 0, 0)
    return d >= today
  })
})

// ── Auto-clean past events ────────────────────────────────────────────────────
const autoCleanPastEvents = async () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const past = eventsStore.upcomingEvents.filter(e => {
    const d = parseEventDate(e.date)
    d.setHours(0, 0, 0, 0)
    return d < today
  })
  for (const e of past) {
    await eventsStore.deleteEvent(e.id).catch(() => {})
  }
}

// ── Options ───────────────────────────────────────────────────────────────────
const timeOptions = computed(() => {
  const times: string[] = []
  for (let hour = 18; hour <= 22; hour++) {
    for (const minute of [0, 30]) {
      if (hour === 22 && minute === 30) break
      const h = hour % 12 === 0 ? 12 : hour % 12
      const m = minute.toString().padStart(2, '0')
      times.push(`${h}:${m} PM`)
    }
  }
  return times
})

const entryFeeOptions = computed(() => {
  const fees: { label: string; value: string }[] = [{ label: 'Free', value: '0.00' }]
  for (let i = 5; i <= 100; i += 5) fees.push({ label: `$${i}.00`, value: i.toFixed(2) })
  return fees
})

// ── Edit modal ────────────────────────────────────────────────────────────────
const editModal = reactive({ open: false, id: '' })
const editForm = reactive({ title: '', dateISO: '', time: '', entry: '', description: '', gameTypeId: '', customGameType: '' })
const editError = ref('')
const saving = ref(false)

const openEdit = (event: SpecialEvent) => {
  editModal.id = event.id
  editForm.title = event.title
  editForm.dateISO = parseReadableDateToISO(event.date)
  editForm.time = event.time
  editForm.entry = event.entry
  editForm.description = event.description
  // Restore game type: if stored id matches a catalog type, use it; else treat as custom
  if (!event.gameTypeId) {
    editForm.gameTypeId = ''
    editForm.customGameType = ''
  } else if (event.gameTypeId === 'custom') {
    editForm.gameTypeId = 'custom'
    editForm.customGameType = event.gameTypeName || ''
  } else {
    editForm.gameTypeId = event.gameTypeId
    editForm.customGameType = ''
  }
  editError.value = ''
  editModal.open = true
}

const closeEdit = () => { editModal.open = false }

const saveEdit = async () => {
  if (editForm.gameTypeId === 'custom' && !editForm.customGameType.trim()) {
    editError.value = 'Please enter a custom game type name'
    return
  }
  saving.value = true
  editError.value = ''
  try {
    let gameTypeId: string | undefined
    let gameTypeName: string | undefined
    if (editForm.gameTypeId === 'custom') {
      gameTypeId = 'custom'
      gameTypeName = editForm.customGameType.trim()
    } else if (editForm.gameTypeId) {
      gameTypeId = editForm.gameTypeId
      gameTypeName = catalogTypes.value.find(t => t.id === editForm.gameTypeId)?.name
    }
    await eventsStore.updateEvent(editModal.id, {
      title: editForm.title,
      date: formatDateToReadable(editForm.dateISO),
      time: editForm.time,
      entry: editForm.entry,
      description: editForm.description,
      gameTypeId,
      gameTypeName,
    })
    closeEdit()
  } catch (e) {
    editError.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    saving.value = false
  }
}

// ── Delete modal ──────────────────────────────────────────────────────────────
const deleteModal = reactive({ open: false, id: '', title: '' })

const confirmDelete = (event: SpecialEvent) => {
  deleteModal.id = event.id
  deleteModal.title = event.title
  deleteModal.open = true
}

const executeDelete = async () => {
  saving.value = true
  try {
    await eventsStore.deleteEvent(deleteModal.id)
    deleteModal.open = false
  } finally {
    saving.value = false
  }
}

// ── Reset ─────────────────────────────────────────────────────────────────────
const resetEvents = async () => {
  if (!confirm('Reset all events to defaults? Custom events will be removed.')) return
  await eventsStore.resetToDefaults().catch(() => {})
}

onMounted(async () => {
  await eventsStore.fetchEvents()
  await autoCleanPastEvents()
  if (productsStore.catalog.types.length === 0) await productsStore.fetchCatalog()
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
  transition: box-shadow 0.15s, border-color 0.15s;
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
