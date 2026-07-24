<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="container mx-auto px-4">
      <div class="max-w-6xl mx-auto">
        <div class="mb-8">
          <h1 class="font-cinzel text-4xl font-bold text-gray-800 mb-2">Outpost Admin</h1>
          <p class="text-gray-600">Manage Events and Product Listings</p>
        </div>

        <!-- Tab Navigation -->
        <div class="mb-8">
          <div class="border-b border-gray-200">
            <nav class="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                :class="[
                  activeTab === 'events'
                    ? 'border-outpost-navy text-outpost-navy'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                  'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                ]"
                @click="activeTab = 'events'"
              >
                Special Events
              </button>
              <button
                :class="[
                  activeTab === 'tcgplayer'
                    ? 'border-outpost-navy text-outpost-navy'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                  'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                ]"
                @click="activeTab = 'tcgplayer'"
              >
                TCGPlayer Listings
              </button>
            </nav>
          </div>
        </div>

        <!-- Events Tab -->
        <div v-if="activeTab === 'events'">
          <!-- Add/Edit Event Form -->
          <div class="card-mtg mb-8">
            <h2 class="font-cinzel text-2xl font-bold mb-6 text-gray-800">
              {{ editingEvent ? 'Edit Event' : 'Add New Event' }}
            </h2>
            <form class="space-y-4" @submit.prevent="handleSubmit">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
                <input
                  v-model="formData.title"
                  type="text"
                  required
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-outpost-navy focus:border-transparent"
                  placeholder="e.g., Prerelease Tournament"
                />
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    v-model="formData.dateISO"
                    type="date"
                    required
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-outpost-navy focus:border-transparent"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <select
                    v-model="formData.time"
                    required
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-outpost-navy focus:border-transparent"
                  >
                    <option value="" disabled>Select a time</option>
                    <option v-for="time in timeOptions" :key="time" :value="time">
                      {{ time }}
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Entry Fee</label>
                <select
                  v-model="formData.entry"
                  required
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-outpost-navy focus:border-transparent"
                >
                  <option value="" disabled>Select entry fee</option>
                  <option v-for="fee in entryFeeOptions" :key="fee.value" :value="fee.value">
                    {{ fee.label }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  v-model="formData.description"
                  required
                  rows="3"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-outpost-navy focus:border-transparent"
                  placeholder="Event description..."
                ></textarea>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Associated Set (Optional)</label
                >
                <select
                  v-model="formData.setId"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-outpost-navy focus:border-transparent"
                >
                  <option v-for="set in setOptions" :key="set.id" :value="set.id">
                    {{ set.label }}
                  </option>
                </select>
                <p class="text-xs text-gray-500 mt-1">
                  Select a Magic set to display related images on the Events page
                </p>
              </div>

              <div class="flex gap-3">
                <button
                  type="submit"
                  :disabled="submitting || eventsStore.loading"
                  class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ submitting ? 'Saving...' : editingEvent ? 'Update Event' : 'Add Event' }}
                </button>
                <button
                  v-if="editingEvent"
                  type="button"
                  :disabled="submitting"
                  class="btn-secondary disabled:opacity-50"
                  @click="cancelEdit"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>

          <!-- Events List -->
          <div class="card-mtg">
            <div class="flex justify-between items-center mb-6">
              <h2 class="font-cinzel text-2xl font-bold text-gray-800">
                Current Events ({{ upcomingEventsFiltered.length }})
              </h2>
              <button
                :disabled="eventsStore.loading"
                class="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                aria-label="Reset all events to default values"
                @click="resetEvents"
              >
                Reset to Defaults
              </button>
            </div>

            <!-- Loading State -->
            <div
              v-if="eventsStore.loading && eventsStore.upcomingEvents.length === 0"
              class="text-center py-8"
            >
              <div
                class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-outpost-navy"
              ></div>
              <p class="text-gray-500 mt-2">Loading events...</p>
            </div>

            <!-- Error State -->
            <div v-else-if="eventsStore.error" class="text-center py-8">
              <p class="text-red-600 mb-4">{{ eventsStore.error }}</p>
              <button
                class="btn-primary"
                aria-label="Retry loading events"
                @click="eventsStore.fetchEvents()"
              >
                Retry
              </button>
            </div>

            <!-- Empty State -->
            <div
              v-else-if="upcomingEventsFiltered.length === 0"
              class="text-center py-8 text-gray-500"
            >
              No upcoming events. Add your first event above!
            </div>

            <!-- Events List -->
            <div v-else class="space-y-4">
              <div
                v-for="event in upcomingEventsFiltered"
                :key="event.id"
                class="flex items-start gap-4 p-4 bg-gray-100 rounded-lg"
              >
                <div class="flex-grow">
                  <h3 class="font-semibold text-lg text-gray-800">{{ event.title }}</h3>
                  <p class="text-gray-600 mb-1">{{ event.date }} at {{ event.time }}</p>
                  <p class="text-gray-600 text-sm">{{ event.description }}</p>
                  <p class="text-sm text-gray-500 mt-2">Entry: ${{ event.entry }}</p>
                </div>
                <div class="flex flex-col gap-2">
                  <button
                    class="px-3 py-1 bg-outpost-navy text-white rounded hover:bg-opacity-90 text-sm"
                    :aria-label="`Edit ${event.title}`"
                    @click="startEdit(event)"
                  >
                    Edit
                  </button>
                  <button
                    class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                    :aria-label="`Delete ${event.title}`"
                    @click="deleteEvent(event.id)"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TCGPlayer Listings Tab -->
        <div v-if="activeTab === 'tcgplayer'">
          <AdminTCGPlayer />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useEventsStore, type SpecialEvent } from '../../stores/events'
import AdminTCGPlayer from './AdminTCGPlayer.vue'

const eventsStore = useEventsStore()

const activeTab = ref<'events' | 'tcgplayer'>('events')

const editingEvent = ref<string | null>(null)
const submitting = ref(false)

const formData = reactive({
  title: '',
  date: '',
  dateISO: '',
  time: '',
  entry: '',
  description: '',
  setId: '',
})

// Generate time options for store hours only (6:00 PM - 10:00 PM)
const timeOptions = computed(() => {
  const times: string[] = []
  // Start at 6 PM (hour 18) and go to 10 PM (hour 22)
  for (let hour = 18; hour <= 22; hour++) {
    for (const minute of [0, 30]) {
      // Don't add 10:30 PM, stop at 10:00 PM
      if (hour === 22 && minute === 30) break

      const h = hour % 12 === 0 ? 12 : hour % 12
      const period = hour < 12 ? 'AM' : 'PM'
      const m = minute.toString().padStart(2, '0')
      times.push(`${h}:${m} ${period}`)
    }
  }
  return times
})

// Generate entry fee options from Free to $100 in $5 increments
const entryFeeOptions = computed(() => {
  const fees: { label: string; value: string }[] = [{ label: 'Free', value: '0.00' }]
  for (let i = 5; i <= 100; i += 5) {
    fees.push({ label: `$${i}.00`, value: i.toFixed(2) })
  }
  return fees
})

// Available Magic sets for event association
const setOptions = [
  { id: '', name: 'None', label: 'No specific set' },
  { id: 'tmnt', name: 'Teenage Mutant Ninja Turtles', label: 'TMNT' },
  { id: 'lorwyn', name: 'Lorwyn Eclipsed', label: 'Lorwyn Eclipsed' },
  { id: 'edge-eternities', name: 'Edge of Eternities', label: 'Edge of Eternities' },
  { id: 'avatar', name: 'Avatar: The Last Airbender', label: 'Avatar' },
  { id: 'duskmourn', name: 'Duskmourn: House of Horror', label: 'Duskmourn' },
  { id: 'final-fantasy', name: 'Final Fantasy', label: 'Final Fantasy' },
  { id: 'spiderman', name: 'Spider-Man', label: 'Spider-Man' },
  { id: 'tarkir', name: 'Tarkir: Dragonstorm', label: 'Tarkir' },
]

// Filter out past events (drop after the event day ends)
const upcomingEventsFiltered = computed(() => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  return eventsStore.upcomingEvents.filter(event => {
    const eventDate = parseEventDate(event.date)
    const eventDateOnly = new Date(
      eventDate.getFullYear(),
      eventDate.getMonth(),
      eventDate.getDate()
    )

    // Keep event if it's today or in the future
    return eventDateOnly >= today
  })
})

// Parse event date from various formats
const parseEventDate = (dateString: string): Date => {
  // Try parsing ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return new Date(dateString)
  }
  // Try parsing "Month DD, YYYY" format
  const parsed = new Date(dateString)
  if (!isNaN(parsed.getTime())) {
    return parsed
  }
  // Fallback to current date if parsing fails
  return new Date()
}

// Convert date to readable format
const formatDateToReadable = (isoDate: string): string => {
  const date = new Date(isoDate)
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }
  return date.toLocaleDateString('en-US', options)
}

// Convert readable date to ISO format
const parseReadableDateToISO = (readableDate: string): string => {
  const date = new Date(readableDate)
  if (!isNaN(date.getTime())) {
    const isoString = date.toISOString().split('T')[0]
    return isoString || ''
  }
  return ''
}

// Fetch events when component mounts and auto-clean past events
onMounted(async () => {
  await eventsStore.fetchEvents()
  await autoCleanPastEvents()
})

// Auto-delete past events (events from previous days)
const autoCleanPastEvents = async () => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const pastEvents = eventsStore.upcomingEvents.filter(event => {
    const eventDate = parseEventDate(event.date)
    const eventDateOnly = new Date(
      eventDate.getFullYear(),
      eventDate.getMonth(),
      eventDate.getDate()
    )

    // Delete if event date is before today
    return eventDateOnly < today
  })

  for (const event of pastEvents) {
    try {
      await eventsStore.deleteEvent(event.id)
    } catch (error) {
      console.error('Error auto-deleting past event:', error)
    }
  }
}

const resetForm = () => {
  formData.title = ''
  formData.date = ''
  formData.dateISO = ''
  formData.time = ''
  formData.entry = ''
  formData.description = ''
  formData.setId = ''
  editingEvent.value = null
}

const handleSubmit = async () => {
  if (submitting.value) return

  submitting.value = true
  try {
    // Convert ISO date to readable format for storage
    const readableDate = formatDateToReadable(formData.dateISO)

    const eventData = {
      title: formData.title,
      date: readableDate,
      time: formData.time,
      entry: formData.entry,
      description: formData.description,
      setId: formData.setId || undefined,
    }

    if (editingEvent.value) {
      // Update existing event
      await eventsStore.updateEvent(editingEvent.value, eventData)
    } else {
      // Add new event
      await eventsStore.addEvent(eventData)
    }
    resetForm()
  } catch (error) {
    console.error('Error submitting event:', error)
    alert('Failed to save event. Please try again.')
  } finally {
    submitting.value = false
  }
}

const startEdit = (event: SpecialEvent) => {
  formData.title = event.title
  formData.date = event.date
  formData.dateISO = parseReadableDateToISO(event.date)
  formData.time = event.time
  formData.entry = event.entry
  formData.description = event.description
  formData.setId = ''
  editingEvent.value = event.id
  // Scroll to form
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const cancelEdit = () => {
  resetForm()
}

const deleteEvent = async (id: string) => {
  if (confirm('Are you sure you want to delete this event?')) {
    try {
      await eventsStore.deleteEvent(id)
    } catch (error) {
      console.error('Error deleting event:', error)
      alert('Failed to delete event. Please try again.')
    }
  }
}

const resetEvents = async () => {
  if (confirm('Reset all events to default values? This will remove any custom events.')) {
    try {
      await eventsStore.resetToDefaults()
    } catch (error) {
      console.error('Error resetting events:', error)
      alert('Failed to reset events. Please try again.')
    }
  }
}
</script>
