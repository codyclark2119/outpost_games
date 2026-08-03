<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="container mx-auto px-4">
      <div class="max-w-2xl mx-auto">
        <!-- Header -->
        <div class="flex justify-between items-center mb-8">
          <div>
            <h1 class="font-cinzel text-4xl font-bold text-gray-800">Add Event</h1>
            <p class="text-gray-600 mt-1">Create a new tournament or special event</p>
          </div>
          <router-link :to="{ name: 'AdminEvents' }" class="btn-secondary px-4 py-2">
            ← Manage Events
          </router-link>
        </div>

        <!-- Success banner -->
        <transition name="slide-down">
          <div
            v-if="successMsg"
            class="mb-5 bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-green-700 font-medium"
          >
            ✓ {{ successMsg }}
          </div>
        </transition>

        <!-- Form -->
        <form class="card space-y-5" @submit.prevent="handleSubmit">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Event Title *</label>
            <input
              v-model="form.title"
              type="text"
              required
              class="input-field"
              placeholder="e.g., Prerelease Tournament"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input v-model="form.dateISO" type="date" required class="input-field" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Time *</label>
              <select v-model="form.time" required class="input-field">
                <option value="" disabled>Select a time</option>
                <option v-for="t in timeOptions" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Entry Fee *</label>
            <select v-model="form.entry" required class="input-field">
              <option value="" disabled>Select entry fee</option>
              <option v-for="fee in entryFeeOptions" :key="fee.value" :value="fee.value">
                {{ fee.label }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea
              v-model="form.description"
              required
              rows="4"
              class="input-field resize-none"
              placeholder="Event details, format, prizes, etc."
            ></textarea>
          </div>

          <!-- Game type association -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Game Type <span class="text-gray-400">(Optional)</span></label
            >
            <select v-model="form.gameTypeId" class="input-field">
              <option value="">No specific game type</option>
              <option v-for="t in catalogTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
              <option value="custom">Custom…</option>
            </select>
            <p class="text-xs text-gray-500 mt-1">
              Associates this event with a game type for display on the Events page
            </p>
          </div>

          <!-- Custom game type input -->
          <div v-if="form.gameTypeId === 'custom'">
            <label class="block text-sm font-medium text-gray-700 mb-1">Custom Game Type *</label>
            <input
              v-model="form.customGameType"
              type="text"
              :required="form.gameTypeId === 'custom'"
              class="input-field"
              placeholder="e.g., Flesh and Blood, Lorcana"
            />
          </div>

          <div v-if="formError" class="text-red-600 text-sm">{{ formError }}</div>

          <div class="flex justify-end">
            <button type="submit" class="btn-primary px-6 py-2" :disabled="submitting">
              {{ submitting ? 'Adding…' : 'Add Event' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useEventsStore } from '../../stores/events'
import { useProductsStore } from '../../stores/products'

const eventsStore = useEventsStore()
const productsStore = useProductsStore()

const submitting = ref(false)
const formError = ref('')
const successMsg = ref('')
let successTimer: ReturnType<typeof setTimeout> | null = null

const form = reactive({
  title: '',
  dateISO: '',
  time: '',
  entry: '',
  description: '',
  gameTypeId: '',
  customGameType: '',
})

const catalogTypes = computed(() =>
  productsStore.catalog.types.filter(t => t.isVisible).sort((a, b) => a.sortOrder - b.sortOrder)
)

const resetForm = () => {
  form.title = ''
  form.dateISO = ''
  form.time = ''
  form.entry = ''
  form.description = ''
  form.gameTypeId = ''
  form.customGameType = ''
}

const formatDateToReadable = (isoDate: string): string =>
  new Date(isoDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

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

const resolvedGameType = () => {
  if (!form.gameTypeId) return { gameTypeId: undefined, gameTypeName: undefined }
  if (form.gameTypeId === 'custom') {
    return { gameTypeId: 'custom', gameTypeName: form.customGameType.trim() }
  }
  const type = catalogTypes.value.find(t => t.id === form.gameTypeId)
  return { gameTypeId: form.gameTypeId, gameTypeName: type?.name }
}

const handleSubmit = async () => {
  if (form.gameTypeId === 'custom' && !form.customGameType.trim()) {
    formError.value = 'Please enter a custom game type name'
    return
  }
  formError.value = ''
  submitting.value = true
  try {
    const { gameTypeId, gameTypeName } = resolvedGameType()
    await eventsStore.addEvent({
      title: form.title,
      date: formatDateToReadable(form.dateISO),
      time: form.time,
      entry: form.entry,
      description: form.description,
      gameTypeId,
      gameTypeName,
    })
    const title = form.title
    resetForm()
    successMsg.value = `"${title}" added successfully.`
    if (successTimer) clearTimeout(successTimer)
    successTimer = setTimeout(() => {
      successMsg.value = ''
    }, 4000)
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Failed to add event'
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
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
  transition:
    box-shadow 0.15s,
    border-color 0.15s;
}
.input-field:focus {
  outline: none;
  border-color: transparent;
  box-shadow: 0 0 0 2px #16304a;
}
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
