<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="container mx-auto px-4">
      <div class="max-w-6xl mx-auto">
        <!-- Header -->
        <div class="flex flex-wrap justify-between items-center mb-8 gap-4">
          <div>
            <h1 class="font-cinzel text-4xl font-bold text-gray-800">Square Catalog Editor</h1>
            <p class="text-gray-600 mt-1">Edit product details directly in Square POS</p>
          </div>
          <router-link to="/x/outpostAdmin" class="btn-secondary px-4 py-2">
            ← Dashboard
          </router-link>
        </div>

        <!-- Loading -->
        <div v-if="loading && rows.length === 0" class="text-center py-16">
          <div
            class="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-outpost-gold"
          ></div>
          <p class="mt-4 text-gray-600">Loading catalog…</p>
        </div>

        <!-- Error -->
        <div v-else-if="fetchError" class="card-mtg text-center py-10">
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
            <p class="text-gray-500 text-sm whitespace-nowrap">
              {{ filteredRows.length }} of {{ rows.length }} items
            </p>
          </div>

          <div class="card-mtg overflow-x-auto p-0">
            <table class="w-full text-sm">
              <thead>
                <tr
                  class="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500"
                >
                  <th class="px-4 py-3">Item</th>
                  <th class="px-4 py-3">SKU</th>
                  <th class="px-4 py-3 text-right">Price</th>
                  <th class="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in filteredRows"
                  :key="row.id"
                  class="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                >
                  <td class="px-4 py-2.5 font-medium text-gray-800">{{ row.displayName }}</td>
                  <td class="px-4 py-2.5 text-gray-500">{{ row.sku || '—' }}</td>
                  <td class="px-4 py-2.5 text-right text-gray-700">
                    {{ formatPrice(row.priceCents) }}
                  </td>
                  <td class="px-4 py-2.5 text-right">
                    <button
                      class="text-outpost-navy font-semibold hover:underline"
                      @click="openEdit(row)"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </div>

    <!-- Edit modal -->
    <teleport to="body">
      <transition name="modal-fade">
        <div
          v-if="editModal.open"
          class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          @click.self="closeEdit"
        >
          <div
            class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            @click.stop
          >
            <div class="p-6">
              <h2 class="font-cinzel text-xl font-bold mb-5 text-gray-800">Edit Square Product</h2>

              <div v-if="editLoading" class="text-center py-10 text-gray-500">Loading…</div>

              <template v-else>
                <form class="space-y-4" @submit.prevent="saveEdit">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input v-model="editForm.name" type="text" required class="input-field" />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      v-model="editForm.description"
                      rows="3"
                      class="input-field"
                    ></textarea>
                  </div>

                  <!-- Category -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      v-if="!newCategory.open"
                      v-model="editForm.categoryId"
                      class="input-field"
                      @change="onCategorySelectChange"
                    >
                      <option value="">Uncategorized</option>
                      <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                        {{ cat.path || cat.name }}
                      </option>
                      <option value="__new__">+ New Category…</option>
                    </select>

                    <div v-else class="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
                      <input
                        v-model="newCategory.name"
                        type="text"
                        placeholder="New category name"
                        class="input-field"
                      />
                      <select v-model="newCategory.parentId" class="input-field">
                        <option value="">Top-level (no parent)</option>
                        <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                          {{ cat.path || cat.name }}
                        </option>
                      </select>
                      <div v-if="newCategory.error" class="text-red-600 text-xs">
                        {{ newCategory.error }}
                      </div>
                      <div class="flex gap-2 justify-end">
                        <button
                          type="button"
                          class="btn-secondary px-3 py-1.5 text-sm"
                          @click="cancelNewCategory"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          class="btn-primary px-3 py-1.5 text-sm"
                          :disabled="newCategory.saving"
                          @click="createCategory"
                        >
                          {{ newCategory.saving ? 'Creating…' : 'Create' }}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1"
                      >Online store visibility</label
                    >
                    <select v-model="editForm.ecomVisibility" class="input-field">
                      <option value="VISIBLE">Visible</option>
                      <option value="UNINDEXED">Hidden</option>
                      <option
                        v-if="!['VISIBLE', 'UNINDEXED'].includes(editForm.ecomVisibility)"
                        :value="editForm.ecomVisibility"
                      >
                        {{ editForm.ecomVisibility }} (current, unchanged)
                      </option>
                    </select>
                  </div>

                  <!-- Image -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1"
                      >Product Image</label
                    >
                    <div class="flex items-center gap-3">
                      <img
                        v-if="editForm.imageUrl"
                        :src="editForm.imageUrl"
                        alt=""
                        class="h-16 w-16 object-cover rounded-lg border border-gray-200 no-hover"
                      />
                      <div
                        v-else
                        class="h-16 w-16 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-xs"
                      >
                        None
                      </div>
                      <div class="flex-1">
                        <input
                          ref="imageInput"
                          type="file"
                          accept="image/jpeg,image/png,image/gif"
                          class="text-sm"
                          @change="onImageSelected"
                        />
                        <button
                          type="button"
                          class="btn-secondary px-3 py-1 text-xs mt-1"
                          :disabled="!selectedImageFile || uploadingImage"
                          @click="uploadImage"
                        >
                          {{ uploadingImage ? 'Uploading…' : 'Upload' }}
                        </button>
                        <span v-if="imageError" class="text-red-600 text-xs block mt-1">{{
                          imageError
                        }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Variations -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Variations
                      <span class="text-gray-400 font-normal"
                        >({{ editForm.variations.length }})</span
                      >
                    </label>
                    <div class="space-y-3">
                      <div
                        v-for="variation in editForm.variations"
                        :key="variation.id"
                        class="border border-gray-200 rounded-lg p-3 space-y-2"
                      >
                        <div class="grid grid-cols-2 gap-3">
                          <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Name</label>
                            <input v-model="variation.name" type="text" class="input-field" />
                          </div>
                          <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">SKU</label>
                            <input
                              :value="variation.sku"
                              type="text"
                              disabled
                              class="input-field bg-gray-100 text-gray-400"
                            />
                          </div>
                        </div>

                        <div class="grid grid-cols-3 gap-3 items-end">
                          <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1"
                              >Price ($)</label
                            >
                            <input
                              v-model.number="variation.price"
                              type="number"
                              step="0.01"
                              min="0"
                              class="input-field"
                            />
                          </div>
                          <label class="flex items-center gap-2 text-sm text-gray-700 pb-2">
                            <input v-model="variation.trackInventory" type="checkbox" />
                            Track inventory
                          </label>
                          <label class="flex items-center gap-2 text-sm text-gray-700 pb-2">
                            <input v-model="variation.sellable" type="checkbox" />
                            Sellable
                          </label>
                        </div>

                        <!-- Inventory correction -->
                        <div
                          v-if="variation.trackInventory && variation.quantity !== null"
                          class="bg-gray-50 rounded-lg p-2"
                        >
                          <label class="block text-xs font-medium text-gray-500 mb-1">
                            Correct On-Hand Count
                            <span class="text-gray-400 font-normal"
                              >(currently {{ variation.quantity }})</span
                            >
                          </label>
                          <div class="flex gap-2">
                            <input
                              v-model.number="variation.correctedQuantity"
                              type="number"
                              min="0"
                              step="1"
                              class="input-field"
                            />
                            <button
                              type="button"
                              class="btn-secondary px-3 text-sm whitespace-nowrap"
                              :disabled="variation.correctingCount"
                              @click="correctInventory(variation)"
                            >
                              {{ variation.correctingCount ? 'Setting…' : 'Set Count' }}
                            </button>
                          </div>
                          <span
                            v-if="variation.inventoryError"
                            class="text-red-600 text-xs block mt-1"
                            >{{ variation.inventoryError }}</span
                          >
                          <span
                            v-if="variation.inventorySuccess"
                            class="text-green-600 text-xs block mt-1"
                            >Count updated.</span
                          >
                        </div>

                        <!-- Per-variation delete -->
                        <div class="flex justify-end pt-1">
                          <template v-if="!variation.deleteConfirming">
                            <button
                              type="button"
                              class="text-red-600 text-xs font-semibold hover:underline disabled:text-gray-300 disabled:no-underline disabled:cursor-not-allowed"
                              :disabled="editForm.variations.length <= 1"
                              :title="
                                editForm.variations.length <= 1
                                  ? 'Delete the whole item instead — it must keep at least one variation'
                                  : ''
                              "
                              @click="variation.deleteConfirming = true"
                            >
                              Delete Variation
                            </button>
                          </template>
                          <template v-else>
                            <span class="text-xs text-gray-600 flex items-center gap-2">
                              Delete this variation permanently?
                              <button
                                type="button"
                                class="text-gray-500 hover:underline"
                                @click="variation.deleteConfirming = false"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                class="text-red-600 font-semibold hover:underline"
                                :disabled="variation.deleting"
                                @click="deleteVariation(variation)"
                              >
                                {{ variation.deleting ? 'Deleting…' : 'Confirm' }}
                              </button>
                            </span>
                          </template>
                        </div>
                        <span v-if="variation.deleteError" class="text-red-600 text-xs block">{{
                          variation.deleteError
                        }}</span>
                      </div>
                    </div>
                  </div>

                  <div v-if="editError" class="text-red-600 text-sm">{{ editError }}</div>

                  <div class="flex justify-between items-center pt-2">
                    <button
                      type="button"
                      class="text-red-600 text-sm font-semibold hover:underline"
                      @click="openDeleteConfirm"
                    >
                      Delete Item
                    </button>
                    <div class="flex gap-3">
                      <button type="button" class="btn-secondary px-5 py-2" @click="closeEdit">
                        Cancel
                      </button>
                      <button type="submit" class="btn-primary px-5 py-2" :disabled="saving">
                        {{ saving ? 'Saving…' : 'Save Changes' }}
                      </button>
                    </div>
                  </div>
                </form>
              </template>
            </div>
          </div>
        </div>
      </transition>
    </teleport>

    <!-- Delete item confirm modal -->
    <teleport to="body">
      <transition name="modal-fade">
        <div
          v-if="deleteModal.open"
          class="fixed inset-0 bg-black/70 z-60 flex items-center justify-center p-4"
          @click.self="closeDeleteConfirm"
        >
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" @click.stop>
            <h2 class="font-cinzel text-lg font-bold mb-2 text-gray-800">
              Delete "{{ editForm.name }}"?
            </h2>
            <p class="text-gray-600 text-sm mb-4">
              This permanently removes the item and all {{ editForm.variations.length }} of its
              variation(s) from Square POS. This cannot be undone. Type the item name to confirm.
            </p>
            <input
              v-model="deleteModal.confirmText"
              type="text"
              class="input-field mb-3"
              :placeholder="editForm.name"
            />
            <div v-if="deleteModal.error" class="text-red-600 text-sm mb-3">
              {{ deleteModal.error }}
            </div>
            <div class="flex gap-3 justify-end">
              <button class="btn-secondary px-5 py-2" @click="closeDeleteConfirm">Cancel</button>
              <button
                class="bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                :disabled="deleteModal.confirmText !== editForm.name || deleteModal.deleting"
                @click="confirmDelete"
              >
                {{ deleteModal.deleting ? 'Deleting…' : 'Delete Permanently' }}
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

interface StockRow {
  id: string
  itemId: string
  displayName: string
  sku: string | null
  priceCents: number | null
}

interface SquareCategory {
  id: string
  name: string | null
  path: string
}

interface VariationForm {
  id: string
  name: string
  sku: string | null
  price: number
  trackInventory: boolean
  sellable: boolean
  quantity: number | null
  correctedQuantity: number
  correctingCount: boolean
  inventoryError: string
  inventorySuccess: boolean
  deleteConfirming: boolean
  deleting: boolean
  deleteError: string
}

const API_URL = `${import.meta.env.VITE_API_URL || '/api'}/square`

const rows = ref<StockRow[]>([])
const categories = ref<SquareCategory[]>([])
const loading = ref(false)
const fetchError = ref<string | null>(null)
const search = ref('')

const filteredRows = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return rows.value
  return rows.value.filter(
    row =>
      row.displayName.toLowerCase().includes(term) || (row.sku || '').toLowerCase().includes(term)
  )
})

const formatPrice = (cents: number | null) => (cents == null ? '—' : `$${(cents / 100).toFixed(2)}`)

const fetchRows = async () => {
  loading.value = true
  fetchError.value = null
  try {
    const res = await fetch(`${API_URL}/inventory-report`)
    if (!res.ok) throw new Error('Failed to fetch Square catalog')
    const data = await res.json()
    rows.value = data.items || []
  } catch (e) {
    fetchError.value = e instanceof Error ? e.message : 'Failed to load catalog'
  } finally {
    loading.value = false
  }
}

const fetchCategories = async () => {
  try {
    const res = await fetch(`${API_URL}/categories`)
    if (!res.ok) return
    const data = await res.json()
    categories.value = data.categories || []
  } catch {
    // Category picker is a nice-to-have — editing still works without it.
  }
}

// ── Edit modal ────────────────────────────────────────────────────────────────
const editModal = reactive({ open: false, itemId: '' })
const editLoading = ref(false)
const editError = ref('')
const saving = ref(false)
const editForm = reactive({
  name: '',
  description: '',
  categoryId: '',
  ecomVisibility: 'VISIBLE',
  imageUrl: '' as string | null,
  variations: [] as VariationForm[],
})

const toVariationForm = (variation: {
  id: string
  name: string | null
  sku: string | null
  priceCents: number | null
  trackInventory: boolean
  sellable: boolean
  quantity: number | null
}): VariationForm => ({
  id: variation.id,
  name: variation.name || '',
  sku: variation.sku,
  price: variation.priceCents != null ? variation.priceCents / 100 : 0,
  trackInventory: variation.trackInventory,
  sellable: variation.sellable,
  quantity: variation.quantity,
  correctedQuantity: variation.quantity ?? 0,
  correctingCount: false,
  inventoryError: '',
  inventorySuccess: false,
  deleteConfirming: false,
  deleting: false,
  deleteError: '',
})

const openEdit = async (row: StockRow) => {
  editModal.itemId = row.itemId
  editModal.open = true
  editLoading.value = true
  editError.value = ''
  imageError.value = ''
  selectedImageFile.value = null
  try {
    const res = await fetch(`${API_URL}/products/${row.itemId}`)
    if (!res.ok) throw new Error('Failed to load product details')
    const { item } = await res.json()
    editForm.name = item.name || ''
    editForm.description = item.description || ''
    editForm.categoryId = item.categories?.[0]?.id || ''
    editForm.ecomVisibility = item.ecomVisibility || 'VISIBLE'
    editForm.imageUrl = item.imageUrl || null
    editForm.variations = (item.variations || []).map(toVariationForm)
  } catch (e) {
    editError.value = e instanceof Error ? e.message : 'Failed to load product details'
  } finally {
    editLoading.value = false
  }
}

const closeEdit = () => {
  editModal.open = false
  cancelNewCategory()
}

const saveEdit = async () => {
  if (editForm.categoryId === '__new__') {
    editError.value = 'Finish creating the new category first'
    return
  }
  saving.value = true
  editError.value = ''
  try {
    const res = await fetch(`${API_URL}/products/${editModal.itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editForm.name,
        description: editForm.description,
        categoryIds: editForm.categoryId ? [editForm.categoryId] : [],
        ecomVisibility: editForm.ecomVisibility,
        variations: editForm.variations.map(v => ({
          id: v.id,
          name: v.name,
          priceCents: Math.round(v.price * 100),
          trackInventory: v.trackInventory,
          sellable: v.sellable,
        })),
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Save failed')
    }
    await fetchRows()
    closeEdit()
  } catch (e) {
    editError.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    saving.value = false
  }
}

// ── New category ──────────────────────────────────────────────────────────────
const newCategory = reactive({ open: false, name: '', parentId: '', saving: false, error: '' })

const cancelNewCategory = () => {
  newCategory.open = false
  newCategory.name = ''
  newCategory.parentId = ''
  newCategory.error = ''
  if (editForm.categoryId === '__new__') editForm.categoryId = ''
}

const createCategory = async () => {
  if (!newCategory.name.trim()) {
    newCategory.error = 'Name is required'
    return
  }
  newCategory.saving = true
  newCategory.error = ''
  try {
    const res = await fetch(`${API_URL}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newCategory.name.trim(),
        parentCategoryId: newCategory.parentId || undefined,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to create category')
    }
    const { category } = await res.json()
    categories.value.push(category)
    editForm.categoryId = category.id
    cancelNewCategory()
  } catch (e) {
    newCategory.error = e instanceof Error ? e.message : 'Failed to create category'
  } finally {
    newCategory.saving = false
  }
}

const onCategorySelectChange = () => {
  if (editForm.categoryId === '__new__') newCategory.open = true
}

// ── Image upload ──────────────────────────────────────────────────────────────
const imageInput = ref<HTMLInputElement | null>(null)
const selectedImageFile = ref<File | null>(null)
const uploadingImage = ref(false)
const imageError = ref('')

const onImageSelected = (event: Event) => {
  const target = event.target as HTMLInputElement
  selectedImageFile.value = target.files?.[0] || null
}

const uploadImage = async () => {
  if (!selectedImageFile.value) return
  uploadingImage.value = true
  imageError.value = ''
  try {
    const formData = new FormData()
    formData.append('image', selectedImageFile.value)
    const res = await fetch(`${API_URL}/products/${editModal.itemId}/image`, {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Upload failed')
    }
    const data = await res.json()
    editForm.imageUrl = data.imageUrl
    selectedImageFile.value = null
    if (imageInput.value) imageInput.value.value = ''
  } catch (e) {
    imageError.value = e instanceof Error ? e.message : 'Upload failed'
  } finally {
    uploadingImage.value = false
  }
}

// ── Per-variation inventory correction ────────────────────────────────────────
const correctInventory = async (variation: VariationForm) => {
  variation.correctingCount = true
  variation.inventoryError = ''
  variation.inventorySuccess = false
  try {
    const res = await fetch(`${API_URL}/products/${editModal.itemId}/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variationId: variation.id, quantity: variation.correctedQuantity }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to set count')
    }
    variation.quantity = variation.correctedQuantity
    variation.inventorySuccess = true
    await fetchRows()
  } catch (e) {
    variation.inventoryError = e instanceof Error ? e.message : 'Failed to set count'
  } finally {
    variation.correctingCount = false
  }
}

// ── Per-variation delete ──────────────────────────────────────────────────────
const deleteVariation = async (variation: VariationForm) => {
  variation.deleting = true
  variation.deleteError = ''
  try {
    const res = await fetch(`${API_URL}/products/${editModal.itemId}/variations/${variation.id}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Delete failed')
    }
    editForm.variations = editForm.variations.filter(v => v.id !== variation.id)
    await fetchRows()
  } catch (e) {
    variation.deleteError = e instanceof Error ? e.message : 'Delete failed'
    variation.deleteConfirming = false
  } finally {
    variation.deleting = false
  }
}

// ── Delete item ────────────────────────────────────────────────────────────────
const deleteModal = reactive({ open: false, confirmText: '', deleting: false, error: '' })

const openDeleteConfirm = () => {
  deleteModal.open = true
  deleteModal.confirmText = ''
  deleteModal.error = ''
}

const closeDeleteConfirm = () => {
  deleteModal.open = false
}

const confirmDelete = async () => {
  deleteModal.deleting = true
  deleteModal.error = ''
  try {
    const res = await fetch(`${API_URL}/products/${editModal.itemId}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Delete failed')
    }
    closeDeleteConfirm()
    closeEdit()
    await fetchRows()
  } catch (e) {
    deleteModal.error = e instanceof Error ? e.message : 'Delete failed'
  } finally {
    deleteModal.deleting = false
  }
}

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
</style>
