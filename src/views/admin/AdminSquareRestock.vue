<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="container mx-auto px-4">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="flex flex-wrap justify-between items-center mb-8 gap-4">
          <div>
            <h1 class="font-cinzel text-4xl font-bold text-gray-800">Quick Restock</h1>
            <p class="text-gray-600 mt-1">Open a sealed box, restock loose packs in one click</p>
          </div>
          <router-link to="/x/outpostAdmin" class="btn-secondary px-4 py-2">
            ← Dashboard
          </router-link>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="text-center py-16">
          <div
            class="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-outpost-gold"
          ></div>
          <p class="mt-4 text-gray-600">Loading…</p>
        </div>

        <!-- Error -->
        <div v-else-if="fetchError" class="card text-center py-10">
          <p class="text-red-600 mb-4">{{ fetchError }}</p>
          <button class="btn-primary px-6 py-2" @click="fetchAll">Retry</button>
        </div>

        <template v-else>
          <!-- Quick Restock -->
          <div class="card p-6 mb-6">
            <h2 class="font-cinzel text-xl font-bold text-gray-800 mb-4">Quick Restock</h2>

            <div v-if="mappings.length === 0" class="text-gray-500 text-sm">
              No restock pairs configured yet — add one below first.
            </div>

            <template v-else>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">Restock Pair</label>
                  <select v-model="restockForm.mappingId" class="input-field">
                    <option value="">Select a pair…</option>
                    <option v-for="m in mappings" :key="m.id" :value="m.id">
                      {{ m.boxName }} → {{ m.packsName }} ({{ m.packsPerBox }}/box)
                    </option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">Boxes Opened</label>
                  <input
                    v-model="restockForm.boxesOpened"
                    type="number"
                    min="1"
                    step="1"
                    class="input-field"
                  />
                </div>
              </div>

              <!-- Live client-side preview — the authoritative fresh read happens
                   server-side on submit, so this may differ slightly if a sale
                   landed in between. -->
              <div
                v-if="selectedMapping && boxesOpenedValid"
                class="bg-gray-50 rounded-lg p-4 mb-4 text-sm"
              >
                <p class="text-gray-600 mb-1">
                  <strong>{{ selectedMapping.boxName }}</strong
                  >: {{ previewBoxQty }} → {{ previewBoxQty - restockFormBoxesOpened }}
                </p>
                <p class="text-gray-600">
                  <strong>{{ selectedMapping.packsName }}</strong
                  >: {{ previewPacksQty }} →
                  {{ previewPacksQty + restockFormBoxesOpened * selectedMapping.packsPerBox }}
                </p>
                <p class="text-gray-400 text-xs mt-2">Final counts confirmed on submit.</p>
              </div>
              <p
                v-if="selectedMapping && boxesOpenedValid && restockFormBoxesOpened > previewBoxQty"
                class="text-red-600 text-xs mb-4"
              >
                Only {{ previewBoxQty }} box(es) in stock.
              </p>

              <span v-if="restockForm.error" class="text-red-600 text-sm block mb-3">{{
                restockForm.error
              }}</span>
              <div
                v-if="restockForm.result"
                class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 text-sm text-green-800"
              >
                Restocked. {{ restockForm.result.boxName }}:
                {{ restockForm.result.previousBoxQty }} → {{ restockForm.result.newBoxQty }} —
                {{ restockForm.result.packsName }}: {{ restockForm.result.previousPacksQty }} →
                {{ restockForm.result.newPacksQty }}
              </div>

              <button
                type="button"
                class="btn-primary px-6 py-2"
                :disabled="!canApplyRestock || restockForm.applying"
                @click="applyRestock"
              >
                {{ restockForm.applying ? 'Applying…' : 'Apply Restock' }}
              </button>
            </template>
          </div>

          <!-- Configured Restock Pairs -->
          <div class="card p-6">
            <h2 class="font-cinzel text-xl font-bold text-gray-800 mb-4">
              Configured Restock Pairs
            </h2>

            <table v-if="mappings.length > 0" class="w-full text-sm mb-4">
              <thead>
                <tr
                  class="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500"
                >
                  <th class="px-2 py-2">Box</th>
                  <th class="px-2 py-2">Packs</th>
                  <th class="px-2 py-2 text-right">Packs/Box</th>
                  <th class="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="m in mappings"
                  :key="m.id"
                  class="border-b border-gray-100 last:border-0"
                >
                  <td class="px-2 py-2 font-medium text-gray-800">{{ m.boxName }}</td>
                  <td class="px-2 py-2 text-gray-700">{{ m.packsName }}</td>
                  <td class="px-2 py-2 text-right text-gray-700">{{ m.packsPerBox }}</td>
                  <td class="px-2 py-2 text-right">
                    <button
                      class="text-red-600 text-xs font-semibold hover:underline"
                      @click="deleteMapping(m.id)"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>

            <button
              v-if="!newMapping.open"
              type="button"
              class="text-outpost-gold text-sm font-semibold hover:underline"
              @click="newMapping.open = true"
            >
              + New Pairing
            </button>

            <div v-else class="border border-dashed border-gray-300 rounded-lg p-4 space-y-3">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Sealed Box</label>
                <input
                  v-model="newMapping.boxSearch"
                  type="text"
                  placeholder="Search by name or SKU…"
                  class="input-field"
                  @focus="newMapping.boxPickerOpen = true"
                />
                <div
                  v-if="newMapping.boxPickerOpen && boxSearchResults.length > 0"
                  class="border border-gray-200 rounded-lg mt-1 max-h-40 overflow-y-auto"
                >
                  <button
                    v-for="item in boxSearchResults"
                    :key="item.id"
                    type="button"
                    class="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    @click="selectBox(item)"
                  >
                    {{ item.displayName }}
                    <span class="text-gray-400">({{ item.sku || '—' }})</span>
                  </button>
                </div>
                <p v-if="newMapping.boxVariationId" class="text-xs text-green-700 mt-1">
                  Selected: {{ newMapping.boxName }}
                </p>
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Loose Packs</label>
                <input
                  v-model="newMapping.packsSearch"
                  type="text"
                  placeholder="Search by name or SKU…"
                  class="input-field"
                  @focus="newMapping.packsPickerOpen = true"
                />
                <div
                  v-if="newMapping.packsPickerOpen && packsSearchResults.length > 0"
                  class="border border-gray-200 rounded-lg mt-1 max-h-40 overflow-y-auto"
                >
                  <button
                    v-for="item in packsSearchResults"
                    :key="item.id"
                    type="button"
                    class="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    @click="selectPacks(item)"
                  >
                    {{ item.displayName }}
                    <span class="text-gray-400">({{ item.sku || '—' }})</span>
                  </button>
                </div>
                <p v-if="newMapping.packsVariationId" class="text-xs text-green-700 mt-1">
                  Selected: {{ newMapping.packsName }}
                </p>
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Packs per Box</label>
                <input
                  v-model="newMapping.packsPerBox"
                  type="number"
                  min="1"
                  step="1"
                  class="input-field max-w-[10rem]"
                />
              </div>

              <span v-if="newMapping.error" class="text-red-600 text-xs block">{{
                newMapping.error
              }}</span>

              <div class="flex justify-end gap-3">
                <button
                  type="button"
                  class="text-gray-500 text-xs hover:underline"
                  @click="cancelNewMapping"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="btn-secondary px-4 py-1.5 text-sm"
                  :disabled="newMapping.saving"
                  @click="createMapping"
                >
                  {{ newMapping.saving ? 'Creating…' : 'Create' }}
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'

interface InventoryItem {
  id: string
  displayName: string
  sku: string | null
  quantity: number | null
}

interface RestockMapping {
  id: string
  boxVariationId: string
  boxName: string
  packsVariationId: string
  packsName: string
  packsPerBox: number
}

const API_BASE = `${import.meta.env.VITE_API_URL || '/api'}/square`

const loading = ref(false)
const fetchError = ref<string | null>(null)
const items = ref<InventoryItem[]>([])
const mappings = ref<RestockMapping[]>([])

const quantityById = computed(() => new Map(items.value.map(item => [item.id, item.quantity ?? 0])))

const fetchInventory = async () => {
  const res = await fetch(`${API_BASE}/inventory-report`)
  if (!res.ok) throw new Error('Failed to fetch Square inventory report')
  const data = await res.json()
  items.value = data.items || []
}

const fetchMappings = async () => {
  const res = await fetch(`${API_BASE}/restock-mappings`)
  if (!res.ok) throw new Error('Failed to fetch restock mappings')
  const data = await res.json()
  mappings.value = data.mappings || []
}

const fetchAll = async () => {
  loading.value = true
  fetchError.value = null
  try {
    await Promise.all([fetchInventory(), fetchMappings()])
  } catch (e) {
    fetchError.value = e instanceof Error ? e.message : 'Failed to load'
  } finally {
    loading.value = false
  }
}

// ── New pairing form ──────────────────────────────────────────────────────────
const newMapping = reactive({
  open: false,
  boxSearch: '',
  boxPickerOpen: false,
  boxVariationId: '',
  boxName: '',
  packsSearch: '',
  packsPickerOpen: false,
  packsVariationId: '',
  packsName: '',
  packsPerBox: '' as string,
  saving: false,
  error: '',
})

const searchItems = (term: string) => {
  const t = term.trim().toLowerCase()
  if (!t) return []
  return items.value
    .filter(
      item =>
        item.displayName.toLowerCase().includes(t) || (item.sku || '').toLowerCase().includes(t)
    )
    .slice(0, 20)
}

const boxSearchResults = computed(() => searchItems(newMapping.boxSearch))
const packsSearchResults = computed(() => searchItems(newMapping.packsSearch))

const selectBox = (item: InventoryItem) => {
  newMapping.boxVariationId = item.id
  newMapping.boxName = item.displayName
  newMapping.boxSearch = item.displayName
  newMapping.boxPickerOpen = false
}

const selectPacks = (item: InventoryItem) => {
  newMapping.packsVariationId = item.id
  newMapping.packsName = item.displayName
  newMapping.packsSearch = item.displayName
  newMapping.packsPickerOpen = false
}

const cancelNewMapping = () => {
  newMapping.open = false
  newMapping.boxSearch = ''
  newMapping.boxVariationId = ''
  newMapping.boxName = ''
  newMapping.packsSearch = ''
  newMapping.packsVariationId = ''
  newMapping.packsName = ''
  newMapping.packsPerBox = ''
  newMapping.error = ''
}

const createMapping = async () => {
  const packsPerBox = parseInt(newMapping.packsPerBox, 10)
  if (!newMapping.boxVariationId || !newMapping.packsVariationId) {
    newMapping.error = 'Select both a box and a packs variation'
    return
  }
  if (newMapping.boxVariationId === newMapping.packsVariationId) {
    newMapping.error = 'Box and packs must be different variations'
    return
  }
  if (!Number.isInteger(packsPerBox) || packsPerBox <= 0) {
    newMapping.error = 'Packs per box must be a positive integer'
    return
  }

  newMapping.saving = true
  newMapping.error = ''
  try {
    const res = await fetch(`${API_BASE}/restock-mappings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boxVariationId: newMapping.boxVariationId,
        boxName: newMapping.boxName,
        packsVariationId: newMapping.packsVariationId,
        packsName: newMapping.packsName,
        packsPerBox,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Failed to create pairing')
    mappings.value.push(data.mapping)
    cancelNewMapping()
  } catch (e) {
    newMapping.error = e instanceof Error ? e.message : 'Failed to create pairing'
  } finally {
    newMapping.saving = false
  }
}

const deleteMapping = async (id: string) => {
  try {
    const res = await fetch(`${API_BASE}/restock-mappings/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete pairing')
    mappings.value = mappings.value.filter(m => m.id !== id)
    if (restockForm.mappingId === id) restockForm.mappingId = ''
  } catch {
    // Non-critical — the list will still reflect the real state on next refresh.
  }
}

// ── Quick Restock action ──────────────────────────────────────────────────────
interface RestockResult {
  boxName: string
  packsName: string
  previousBoxQty: number
  newBoxQty: number
  previousPacksQty: number
  newPacksQty: number
}

const restockForm = reactive({
  mappingId: '',
  boxesOpened: '1',
  applying: false,
  error: '',
  result: null as RestockResult | null,
})

const selectedMapping = computed(
  () => mappings.value.find(m => m.id === restockForm.mappingId) || null
)
const restockFormBoxesOpened = computed(() => parseInt(restockForm.boxesOpened, 10) || 0)
const boxesOpenedValid = computed(
  () => Number.isInteger(restockFormBoxesOpened.value) && restockFormBoxesOpened.value > 0
)
const previewBoxQty = computed(() =>
  selectedMapping.value ? (quantityById.value.get(selectedMapping.value.boxVariationId) ?? 0) : 0
)
const previewPacksQty = computed(() =>
  selectedMapping.value ? (quantityById.value.get(selectedMapping.value.packsVariationId) ?? 0) : 0
)

const canApplyRestock = computed(
  () =>
    !!selectedMapping.value &&
    boxesOpenedValid.value &&
    restockFormBoxesOpened.value <= previewBoxQty.value
)

const applyRestock = async () => {
  if (!selectedMapping.value) return
  restockForm.applying = true
  restockForm.error = ''
  restockForm.result = null
  try {
    const res = await fetch(`${API_BASE}/restock-mappings/${selectedMapping.value.id}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boxesOpened: restockFormBoxesOpened.value }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || data.message || 'Restock failed')
    restockForm.result = {
      boxName: selectedMapping.value.boxName,
      packsName: selectedMapping.value.packsName,
      previousBoxQty: data.previousBoxQty,
      newBoxQty: data.newBoxQty,
      previousPacksQty: data.previousPacksQty,
      newPacksQty: data.newPacksQty,
    }
    await fetchInventory()
  } catch (e) {
    restockForm.error = e instanceof Error ? e.message : 'Restock failed'
  } finally {
    restockForm.applying = false
  }
}

onMounted(fetchAll)
</script>
