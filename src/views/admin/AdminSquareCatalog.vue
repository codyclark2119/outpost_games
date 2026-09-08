<template>
  <div class="min-h-screen bg-gray-50 py-12 pb-28">
    <div class="container mx-auto px-4">
      <div class="max-w-6xl mx-auto">
        <!-- Header -->
        <div class="flex flex-wrap justify-between items-center mb-8 gap-4">
          <div>
            <h1 class="font-cinzel text-4xl font-bold text-gray-800">Square Catalog Editor</h1>
            <p class="text-gray-600 mt-1">Edit product details directly in Square POS</p>
          </div>
          <router-link :to="{ name: 'AdminDashboard' }" class="btn-secondary px-4 py-2">
            ← Dashboard
          </router-link>
        </div>

        <p v-if="success" role="status" class="text-green-700 mb-4">{{ success }}</p>
        <!-- Loading -->
        <div v-if="loading && rows.length === 0" class="text-center py-16">
          <div
            class="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-outpost-gold"
          ></div>
          <p class="mt-4 text-gray-600">Loading catalog…</p>
        </div>

        <!-- Error -->
        <div v-else-if="fetchError" class="card text-center py-10">
          <p class="text-red-600 mb-4">{{ fetchError }}</p>
          <button class="btn-primary px-6 py-2" @click="fetchRows">Retry</button>
        </div>

        <template v-else>
          <div class="mb-4 flex justify-between items-center gap-4">
            <input
              v-model="search"
              type="text"
              placeholder="Search by name or SKU…"
              class="input-field max-w-sm"
            />
            <div class="flex items-center gap-3">
              <button
                type="button"
                class="btn-secondary px-4 py-2 text-sm whitespace-nowrap"
                @click="openCategoryPanel"
              >
                Manage Categories
              </button>
              <p class="text-gray-500 text-sm whitespace-nowrap">
                {{ filteredRows.length }} of {{ rows.length }} items
              </p>
            </div>
          </div>

          <p v-if="categoriesError" class="text-amber-800 mb-4" role="alert">
            Categories are unavailable.
            <button class="underline" @click="fetchCategories">Retry</button>
          </p>
          <p v-if="!filteredRows.length" class="text-gray-500 py-8">No matching products.</p>
          <div class="space-y-3">
            <CatalogCategoryGroup
              v-for="group in groupedFilteredRows"
              :key="group.name"
              :group="group"
              :selection-state="groupSelectionState(group)"
              :expanded="expandedCategories.has(group.name)"
              :selected-item-ids="selectedItemIds"
              @select-group="toggleGroupSelection"
              @toggle="toggleCategory"
              @select="toggleItemSelection"
              @edit="openEdit"
            />
          </div>
        </template>
      </div>
    </div>

    <BulkActionsBar
      v-model="bulkReleasedAt"
      :selected-count="selectedItemIds.size"
      :categories="categories"
      :running="bulkAction.running"
      :error="bulkAction.error"
      @on-bulk-category-change="onBulkCategoryChange"
      @on-bulk-visibility-change="onBulkVisibilityChange"
      @on-bulk-sellable-change="onBulkSellableChange"
      @released-at="applyBulkReleasedAt"
      @delete="bulkDeleteModal.open = true"
      @clear="clearSelection"
    />

    <!-- Bulk delete confirmation -->
    <AdminDialog
      :open="bulkDeleteModal.open"
      title="Catalog editor"
      @close="!bulkAction.running && (bulkDeleteModal.open = false)"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <h2 class="font-cinzel text-xl font-bold mb-4 text-gray-800">
          Delete {{ selectedItemIds.size }} item(s)?
        </h2>
        <ul class="text-sm text-gray-700 list-disc pl-5 mb-3 max-h-40 overflow-y-auto">
          <li v-for="name in bulkDeletePreviewNames" :key="name">{{ name }}</li>
        </ul>
        <p v-if="selectedItemIds.size > 10" class="text-sm text-gray-500 mb-4">
          …and {{ selectedItemIds.size - 10 }} more
        </p>
        <label class="flex items-start gap-2 text-sm text-gray-700 mb-4">
          <input v-model="bulkDeleteModal.confirmed" type="checkbox" class="mt-0.5" />
          I understand this permanently deletes {{ selectedItemIds.size }} item(s) and all their
          variations.
        </label>
        <span v-if="bulkAction.error" class="text-red-600 text-sm block mb-3">{{
          bulkAction.error
        }}</span>
        <div class="flex justify-end gap-3">
          <button
            class="btn-secondary px-4 py-2"
            :disabled="bulkAction.running"
            @click="bulkDeleteModal.open = false"
          >
            Cancel
          </button>
          <button
            class="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
            :disabled="!bulkDeleteModal.confirmed || bulkAction.running"
            @click="confirmBulkDelete"
          >
            {{ bulkAction.running ? 'Deleting…' : 'Delete Permanently' }}
          </button>
        </div>
      </div>
    </AdminDialog>

    <CategoryManager
      ref="categoryManager"
      :categories="categories"
      :error="categoriesError"
      @refresh="refreshCatalog"
    />
    <ProductEditorModal
      ref="productEditor"
      :categories="categories"
      @refresh="onProductSaved"
      @categories-changed="fetchCategories"
    />
  </div>
</template>

<script setup lang="ts">
import BulkActionsBar from '../../components/admin/catalog/BulkActionsBar.vue'
import AdminDialog from '../../components/admin/AdminDialog.vue'
import { ref, reactive, computed, onMounted } from 'vue'

import type { StockRow } from '../../components/admin/catalog/types'
import CatalogCategoryGroup from '../../components/admin/catalog/CatalogCategoryGroup.vue'
import CategoryManager from '../../components/admin/catalog/CategoryManager.vue'
import ProductEditorModal from '../../components/admin/catalog/ProductEditorModal.vue'
import { useSquareCatalogAdmin } from '../../composables/useSquareCatalogAdmin'
import { useCatalogSelection } from '../../composables/useCatalogSelection'
import { squareAdminApi, type BulkActionPath, type BulkUpdate } from '../../services/squareAdminApi'

const {
  rows,
  categories,
  loading,
  fetchError,
  categoriesError,
  search,
  filteredRows,
  groupedFilteredRows,
  expandedCategories,
  toggleCategory,
  fetchRows,
  fetchCategories,
} = useSquareCatalogAdmin()

const {
  selectedItemIds,
  toggleItemSelection,
  clearSelection,
  groupSelectionState,
  toggleGroupSelection,
} = useCatalogSelection(() => bulkAction.running || bulkDeleteModal.open)
const bulkAction = reactive({ running: false, error: '' })
const success = ref('')

const runBulkAction = async (path: BulkActionPath, body: Omit<BulkUpdate, 'itemIds'>) => {
  if (bulkAction.running) return
  bulkAction.running = true
  bulkAction.error = ''
  success.value = ''
  try {
    await squareAdminApi.bulkUpdate(path, { itemIds: [...selectedItemIds.value], ...body })
    success.value = 'Catalog changes saved.'
    clearSelection()
    await fetchRows()
  } catch (e) {
    bulkAction.error = e instanceof Error ? e.message : 'Bulk action failed'
  } finally {
    bulkAction.running = false
  }
}

const onBulkCategoryChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  if (!value) return
  const categoryId = value === '__none__' ? null : value
  ;(event.target as HTMLSelectElement).value = ''
  runBulkAction('/products/batch-category', { categoryId })
}

const onBulkVisibilityChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  if (!value) return
  ;(event.target as HTMLSelectElement).value = ''
  runBulkAction('/products/batch-visibility', { hiddenFromWeb: value === 'true' })
}

const onBulkSellableChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  if (!value) return
  ;(event.target as HTMLSelectElement).value = ''
  runBulkAction('/products/batch-visibility', { sellable: value === 'true' })
}

const bulkReleasedAt = ref('')

const applyBulkReleasedAt = () => {
  if (!bulkReleasedAt.value) return
  const releasedAt = bulkReleasedAt.value
  bulkReleasedAt.value = ''
  runBulkAction('/products/batch-released-at', { releasedAt })
}

const bulkDeleteModal = reactive({ open: false, confirmed: false })

// Deduplicated display names for the confirmation modal — the list is
// per-variation, so the same itemId can appear multiple times.
const bulkDeletePreviewNames = computed(() => {
  const seen = new Set<string>()
  const names: string[] = []
  for (const row of rows.value) {
    if (!selectedItemIds.value.has(row.itemId) || seen.has(row.itemId)) continue
    seen.add(row.itemId)
    names.push(row.displayName)
    if (names.length >= 10) break
  }
  return names
})

const confirmBulkDelete = async () => {
  await runBulkAction('/products/batch-delete', {})
  if (bulkAction.error) return
  bulkDeleteModal.open = false
  bulkDeleteModal.confirmed = false
}

const categoryManager = ref<InstanceType<typeof CategoryManager> | null>(null)
const openCategoryPanel = () => categoryManager.value?.openCategoryPanel()
const refreshCatalog = () => Promise.all([fetchRows(), fetchCategories()])

const onProductSaved = () => {
  success.value = 'Product changes saved.'
  return fetchRows()
}
const productEditor = ref<InstanceType<typeof ProductEditorModal> | null>(null)
const openEdit = (row: StockRow) => productEditor.value?.openEdit(row)

onMounted(() => {
  fetchRows()
  fetchCategories()
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
