<template>
  <div class="min-h-screen bg-gray-50 py-12 pb-28">
    <div class="container mx-auto px-4">
      <div class="max-w-6xl mx-auto">
        <!-- Header -->
        <div class="flex flex-wrap justify-between items-center mb-8 gap-4">
          <div>
            <h1 class="font-cinzel text-4xl font-bold text-gray-800">Mass Inventory Update</h1>
            <p class="text-gray-600 mt-1">
              Correct many on-hand counts in one save ({{ report?.environment || '…' }})
            </p>
          </div>
          <router-link to="/x/outpostAdmin" class="btn-secondary px-4 py-2">
            ← Dashboard
          </router-link>
        </div>

        <!-- Loading -->
        <div v-if="loading && items.length === 0" class="text-center py-16">
          <div
            class="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-outpost-gold"
          ></div>
          <p class="mt-4 text-gray-600">Loading inventory…</p>
        </div>

        <!-- Error -->
        <div v-else-if="fetchError" class="card-mtg text-center py-10">
          <p class="text-red-600 mb-4">{{ fetchError }}</p>
          <button class="btn-primary px-6 py-2" @click="fetchReport">Retry</button>
        </div>

        <template v-else>
          <!-- Search -->
          <div class="card-mtg p-4 mb-6">
            <input
              v-model="search"
              type="text"
              placeholder="Search by name or SKU…"
              class="input-field"
            />
          </div>

          <div v-if="saveError" class="card-mtg py-4 px-4 mb-6 border border-red-200 bg-red-50">
            <p class="text-red-600 text-sm">{{ saveError }}</p>
          </div>
          <div
            v-if="saveSuccess"
            class="card-mtg py-4 px-4 mb-6 border border-green-200 bg-green-50"
          >
            <p class="text-green-700 text-sm">Saved {{ lastSavedCount }} corrected count(s).</p>
          </div>

          <!-- Empty state -->
          <div v-if="trackableItems.length === 0" class="card-mtg text-center py-12">
            <p class="text-gray-500">No trackable items match your search.</p>
          </div>

          <!-- Table -->
          <div v-else class="card-mtg overflow-x-auto p-0">
            <table class="w-full text-sm">
              <thead>
                <tr
                  class="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500"
                >
                  <th class="px-4 py-3">Item</th>
                  <th class="px-4 py-3">SKU</th>
                  <th class="px-4 py-3 text-right">Current Qty</th>
                  <th class="px-4 py-3 text-right">New Qty</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in trackableItems"
                  :key="item.id"
                  class="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                  :class="{ 'bg-amber-50': isEdited(item.id) }"
                >
                  <td class="px-4 py-2.5 font-medium text-gray-800">{{ item.displayName }}</td>
                  <td class="px-4 py-2.5 text-gray-500">{{ item.sku || '—' }}</td>
                  <td class="px-4 py-2.5 text-right text-gray-700">{{ item.quantity ?? '—' }}</td>
                  <td class="px-4 py-2.5 text-right">
                    <input
                      v-model="edits[item.id]"
                      type="number"
                      min="0"
                      step="1"
                      :placeholder="String(item.quantity ?? 0)"
                      class="input-field !w-28 text-right py-1"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </div>

    <!-- Sticky save bar -->
    <transition name="fade">
      <div
        v-if="editedCount > 0"
        class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg py-4 z-20"
      >
        <div class="container mx-auto px-4">
          <div class="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <p class="text-sm text-gray-600">{{ editedCount }} row(s) changed</p>
            <div class="flex gap-3">
              <button class="btn-secondary px-4 py-2" :disabled="saving" @click="clearEdits">
                Clear
              </button>
              <button class="btn-primary px-6 py-2" :disabled="saving" @click="saveAll">
                {{ saving ? 'Saving…' : `Save All Changes (${editedCount})` }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'

interface SquareStockItem {
  id: string
  itemId: string
  displayName: string
  sku: string | null
  priceCents: number | null
  currency: string | null
  trackInventory: boolean
  quantity: number | null
  state: string
  inStock: boolean
  source: string
}

interface SquareInventoryReport {
  ok: boolean
  environment: string
  locationId: string | null
  itemCount: number
  items: SquareStockItem[]
}

const API_BASE = `${import.meta.env.VITE_API_URL || '/api'}/square`

const report = ref<SquareInventoryReport | null>(null)
const loading = ref(false)
const fetchError = ref<string | null>(null)
const search = ref('')

const saving = ref(false)
const saveError = ref<string | null>(null)
const saveSuccess = ref(false)
const lastSavedCount = ref(0)

// Keyed by variation id — values are the raw string from the number input.
// Only entries with a non-empty, non-negative value are treated as edits.
const edits = reactive<Record<string, string>>({})

const items = computed(() => report.value?.items || [])

const trackableItems = computed(() => {
  const term = search.value.trim().toLowerCase()
  return items.value.filter(item => {
    if (!item.trackInventory) return false
    if (!term) return true
    return (
      item.displayName.toLowerCase().includes(term) || (item.sku || '').toLowerCase().includes(term)
    )
  })
})

const isEdited = (id: string) => {
  const value = edits[id]
  return value !== undefined && value !== '' && Number.isFinite(Number(value))
}

const editedCount = computed(() => Object.keys(edits).filter(id => isEdited(id)).length)

const clearEdits = () => {
  for (const key of Object.keys(edits)) delete edits[key]
}

const fetchReport = async () => {
  loading.value = true
  fetchError.value = null
  try {
    const res = await fetch(`${API_BASE}/inventory-report`)
    if (!res.ok) throw new Error('Failed to fetch Square inventory report')
    report.value = await res.json()
  } catch (e) {
    fetchError.value = e instanceof Error ? e.message : 'Failed to load inventory report'
  } finally {
    loading.value = false
  }
}

const saveAll = async () => {
  saving.value = true
  saveError.value = null
  saveSuccess.value = false

  const changes = Object.entries(edits)
    .filter(([id]) => isEdited(id))
    .map(([variationId, value]) => ({ variationId, quantity: Number(value) }))

  try {
    const res = await fetch(`${API_BASE}/inventory/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changes }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Batch save failed')

    lastSavedCount.value = data.updatedCount || changes.length
    saveSuccess.value = true
    clearEdits()
    await fetchReport()
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'Batch save failed'
  } finally {
    saving.value = false
  }
}

onMounted(fetchReport)
</script>

<style scoped>
.input-field {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  background: white;
}

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
