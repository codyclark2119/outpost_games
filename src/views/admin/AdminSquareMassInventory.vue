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
          <router-link :to="{ name: 'AdminDashboard' }" class="btn-secondary px-4 py-2">
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
        <div v-else-if="fetchError" class="card text-center py-10">
          <p class="text-red-600 mb-4">{{ fetchError }}</p>
          <button class="btn-primary px-6 py-2" @click="fetchReport">Retry</button>
        </div>

        <template v-else>
          <!-- Search -->
          <div class="card p-4 mb-6">
            <input
              v-model="search"
              type="text"
              placeholder="Search by name or SKU…"
              class="input-field"
            />
          </div>

          <!-- Start from zero -->
          <div
            class="card p-4 mb-6 border"
            :class="startFromZero ? 'border-amber-300 bg-amber-50' : 'border-transparent'"
          >
            <label class="flex items-start gap-3 cursor-pointer">
              <input v-model="startFromZero" type="checkbox" class="mt-1 h-4 w-4" />
              <span>
                <span class="font-semibold text-gray-800">Start from zero</span>
                <span class="block text-sm text-gray-600">
                  Full recount for conventions and other big stock swings — every tracked item in
                  the checked categories is set to 0 unless you enter a count for it. Applies to
                  whole categories, regardless of the search above.
                </span>
              </span>
            </label>

            <div v-if="startFromZero" class="mt-4 pl-7">
              <div class="flex items-center gap-3 mb-2 text-sm">
                <span class="font-medium text-gray-700">Reset categories</span>
                <button type="button" class="text-outpost-navy underline" @click="includeAll">
                  All
                </button>
                <button type="button" class="text-outpost-navy underline" @click="excludeAll">
                  None
                </button>
              </div>
              <div class="flex flex-wrap gap-2">
                <label
                  v-for="group in allGroups"
                  :key="group.name"
                  class="flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm cursor-pointer"
                  :class="
                    isResetCategory(group.name)
                      ? 'border-amber-400 bg-white text-gray-800'
                      : 'border-gray-200 bg-gray-50 text-gray-400'
                  "
                >
                  <input
                    type="checkbox"
                    :checked="isResetCategory(group.name)"
                    @change="toggleResetCategory(group.name)"
                  />
                  {{ group.name }}
                  <span class="text-xs text-gray-400">{{ group.items.length }}</span>
                </label>
              </div>
            </div>
          </div>

          <div v-if="saveError" class="card py-4 px-4 mb-6 border border-red-200 bg-red-50">
            <p class="text-red-600 text-sm">{{ saveError }}</p>
          </div>
          <div v-if="saveSuccess" class="card py-4 px-4 mb-6 border border-green-200 bg-green-50">
            <p class="text-green-700 text-sm">Saved {{ lastSavedCount }} corrected count(s).</p>
          </div>

          <!-- Empty state -->
          <div v-if="trackableItems.length === 0" class="card text-center py-12">
            <p class="text-gray-500">No trackable items match your search.</p>
          </div>

          <!-- Category groups -->
          <div v-else class="space-y-3">
            <div
              v-for="group in groupedTrackableItems"
              :key="group.name"
              class="bg-white rounded-xl shadow border border-gray-200 overflow-hidden"
            >
              <div
                class="flex items-center gap-3 px-4 py-3 bg-outpost-navy text-white cursor-pointer select-none"
                @click="toggleCategory(group.name)"
              >
                <span
                  class="text-lg transition-transform duration-200"
                  :class="expandedCategories.has(group.name) ? 'rotate-90' : ''"
                  >▶</span
                >
                <span class="font-cinzel font-bold text-lg flex-1">{{ group.name }}</span>
                <span
                  v-if="isResetCategory(group.name)"
                  class="text-xs font-semibold px-2 py-0.5 rounded bg-amber-400 text-outpost-navy"
                  >Reset to 0</span
                >
                <span class="text-xs text-white/60"
                  >{{ group.items.length }} item{{ group.items.length !== 1 ? 's' : '' }}</span
                >
              </div>

              <div v-if="expandedCategories.has(group.name)" class="overflow-x-auto">
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
                      v-for="item in group.items"
                      :key="item.id"
                      class="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                      :class="{ 'bg-amber-50': isEdited(item.id) }"
                    >
                      <td class="px-4 py-2.5 font-medium text-gray-800">{{ item.displayName }}</td>
                      <td class="px-4 py-2.5 text-gray-500">{{ item.sku || '—' }}</td>
                      <td
                        class="px-4 py-2.5 text-right"
                        :class="
                          isResetCategory(categoryOf(item)) && !isEdited(item.id)
                            ? 'text-gray-400 line-through'
                            : 'text-gray-700'
                        "
                      >
                        {{ item.quantity ?? '—' }}
                      </td>
                      <td class="px-4 py-2.5 text-right">
                        <input
                          v-model="edits[item.id]"
                          type="number"
                          min="0"
                          step="1"
                          :placeholder="
                            isResetCategory(categoryOf(item)) ? '0' : String(item.quantity ?? 0)
                          "
                          class="input-field !w-28 text-right py-1"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Sticky save bar -->
    <transition name="fade">
      <div
        v-if="pendingChanges.length > 0"
        class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg py-4 z-20"
      >
        <div class="container mx-auto px-4">
          <div class="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <p v-if="startFromZero" class="text-sm text-gray-600">
              {{ editedCount }} counted · {{ resetCount }} reset to 0
            </p>
            <p v-else class="text-sm text-gray-600">{{ editedCount }} row(s) changed</p>
            <div class="flex gap-3">
              <button class="btn-secondary px-4 py-2" :disabled="saving" @click="clearEdits">
                Clear
              </button>
              <button class="btn-primary px-6 py-2" :disabled="saving" @click="saveAll">
                {{
                  saving
                    ? 'Saving…'
                    : startFromZero
                      ? `Reset & Save (${pendingChanges.length})`
                      : `Save All Changes (${editedCount})`
                }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { useConfirmation } from '../../composables/useConfirmation'
const { ask } = useConfirmation()
import { squareAdminApi } from '../../services/squareAdminApi'
import { ref, reactive, computed, onMounted } from 'vue'

import type { SquareStockItem, SquareInventoryReport } from '../../services/squareAdminTypes'

interface CategoryGroup {
  name: string
  items: SquareStockItem[]
}

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

const allTrackableItems = computed(() => items.value.filter(item => item.trackInventory))

const trackableItems = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return allTrackableItems.value
  return allTrackableItems.value.filter(
    item =>
      item.displayName.toLowerCase().includes(term) || (item.sku || '').toLowerCase().includes(term)
  )
})

const categoryOf = (item: SquareStockItem) => item.categoryName || 'Uncategorized'

// Grouped by top-level Square category so a large catalog can be scanned and
// corrected section-by-section instead of one long flat table.
const groupByCategory = (list: SquareStockItem[]): CategoryGroup[] => {
  const byName = new Map<string, CategoryGroup>()
  for (const item of list) {
    const name = categoryOf(item)
    let group = byName.get(name)
    if (!group) {
      group = { name, items: [] }
      byName.set(name, group)
    }
    group.items.push(item)
  }
  return [...byName.values()].sort((a, b) => {
    if (a.name === 'Uncategorized') return 1
    if (b.name === 'Uncategorized') return -1
    return a.name.localeCompare(b.name)
  })
}

const groupedTrackableItems = computed(() => groupByCategory(trackableItems.value))
const allGroups = computed(() => groupByCategory(allTrackableItems.value))

// "Start from zero" mode: every tracked item in a reset category is written
// as 0 unless it has an entered count. Tracked as *excluded* categories so
// the default is "everything", matching a full post-convention recount.
const startFromZero = ref(false)
const excludedCategories = ref(new Set<string>())

const isResetCategory = (name: string) => startFromZero.value && !excludedCategories.value.has(name)

const toggleResetCategory = (name: string) => {
  if (excludedCategories.value.has(name)) excludedCategories.value.delete(name)
  else excludedCategories.value.add(name)
}
const includeAll = () => excludedCategories.value.clear()
const excludeAll = () => {
  excludedCategories.value = new Set(allGroups.value.map(group => group.name))
}

const expandedCategories = ref(new Set<string>())
const toggleCategory = (name: string) => {
  if (expandedCategories.value.has(name)) expandedCategories.value.delete(name)
  else expandedCategories.value.add(name)
}

const isEdited = (id: string) => {
  const value = edits[id]
  return value !== undefined && value !== '' && Number.isFinite(Number(value))
}

const editedCount = computed(() => Object.keys(edits).filter(id => isEdited(id)).length)

// Every write the next save sends. Reset categories deliberately include items
// that already read 0 — a sale since this page loaded may have taken one to
// -1, and Square skips counts that truly didn't change (ignore_unchanged_counts).
const pendingChanges = computed(() => {
  const quantityById = new Map<string, number>()
  if (startFromZero.value) {
    for (const item of allTrackableItems.value) {
      if (isResetCategory(categoryOf(item))) quantityById.set(item.id, 0)
    }
  }
  for (const [id, value] of Object.entries(edits)) {
    if (isEdited(id)) quantityById.set(id, Number(value))
  }
  return [...quantityById].map(([variationId, quantity]) => ({ variationId, quantity }))
})

const resetCount = computed(
  () => pendingChanges.value.filter(change => !isEdited(change.variationId)).length
)

const clearEdits = () => {
  for (const key of Object.keys(edits)) delete edits[key]
  startFromZero.value = false
  includeAll()
}

const fetchReport = async () => {
  loading.value = true
  fetchError.value = null
  try {
    report.value = await squareAdminApi.getCatalog()
  } catch (e) {
    fetchError.value = e instanceof Error ? e.message : 'Failed to load inventory report'
  } finally {
    loading.value = false
  }
}

const saveAll = async () => {
  if (saving.value) return
  saving.value = true
  saveError.value = null
  saveSuccess.value = false

  const changes = pendingChanges.value
  const resetCategoryCount = allGroups.value.filter(group => isResetCategory(group.name)).length
  const message =
    resetCount.value > 0
      ? `Start from zero in ${report.value?.environment}: set ${resetCount.value} variations across ${resetCategoryCount} categories to 0, and ${editedCount.value} to the counts you entered? Every on-hand count in those categories is overwritten.`
      : `Replace on-hand inventory counts for ${changes.length} variations with the entered quantities?`

  try {
    if (!(await ask(message))) return
    const data = await squareAdminApi.updateInventoryBatch(changes)

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
