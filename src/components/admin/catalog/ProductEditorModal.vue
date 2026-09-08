<template>
  <!-- Edit modal -->
  <AdminDialog :open="editModal.open" title="Catalog editor" @close="closeEdit">
    <div
      class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      @click.stop
    >
      <div class="p-6">
        <button
          type="button"
          class="float-right px-3"
          aria-label="Close product editor"
          @click="closeEdit"
        >
          ✕
        </button>
        <h2 class="font-cinzel text-xl font-bold mb-5 text-gray-800">Edit Square Product</h2>

        <div v-if="editLoading" class="text-center py-10 text-gray-500">Loading…</div>

        <p v-else-if="!productLoaded" class="text-red-600" role="alert">{{ editError }}</p>
        <template v-else>
          <form @submit.prevent="saveEdit">
            <fieldset :disabled="editorBusy" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input v-model="editForm.name" type="text" required class="input-field" />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea v-model="editForm.description" rows="3" class="input-field"></textarea>
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
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Website visibility
                  <span class="text-gray-400 font-normal"
                    >— hides it from outpostgamesrgv.com regardless of stock; doesn't affect
                    in-store sales</span
                  >
                </label>
                <select v-model="editForm.hiddenFromWeb" class="input-field">
                  <option :value="false">Visible</option>
                  <option :value="true">Hidden</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Released / Added Date
                  <span class="text-gray-400 font-normal"
                    >— controls "Newest First" order on the public Products page; leave blank to
                    fall back to when this entry was created in Square ({{
                      formatDate(editForm.itemCreatedAt) || 'unknown'
                    }})</span
                  >
                </label>
                <input v-model="editForm.releasedAt" type="date" class="input-field" />
              </div>

              <ProductImageUploader
                :key="editModal.itemId"
                v-model="editForm.imageUrl"
                :item-id="editModal.itemId"
                label="Product image"
                @busy="uploadingImage = $event"
              />

              <!-- Variations -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Variations
                  <span class="text-gray-400 font-normal">({{ editForm.variations.length }})</span>
                </label>
                <div class="space-y-3">
                  <VariationEditor
                    v-for="(variation, index) in editForm.variations"
                    :key="variation.id"
                    v-model="editForm.variations[index]!"
                    :variation-count="editForm.variations.length"
                    :item-id="editModal.itemId"
                    @correct-inventory="correctInventory"
                    @delete-variation="deleteVariation"
                  />
                </div>

                <!-- Add Variation -->
                <div class="mt-3">
                  <button
                    v-if="!addVariationForm.open"
                    type="button"
                    class="text-outpost-gold text-xs font-semibold hover:underline"
                    @click="addVariationForm.open = true"
                  >
                    + Add Variation
                  </button>
                  <div v-else class="border border-dashed border-gray-300 rounded-lg p-3 space-y-2">
                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1">Name</label>
                        <input
                          v-model="addVariationForm.name"
                          type="text"
                          placeholder="e.g. Foil Enhanced"
                          class="input-field"
                        />
                      </div>
                      <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1"
                          >SKU
                          <span class="text-gray-400 font-normal"
                            >(optional, locked after save)</span
                          >
                        </label>
                        <input v-model="addVariationForm.sku" type="text" class="input-field" />
                      </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1"
                          >Price ($)</label
                        >
                        <input
                          v-model="addVariationForm.price"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Leave blank for variable pricing"
                          class="input-field"
                        />
                      </div>
                      <div class="flex items-end gap-4 pb-1">
                        <label class="flex items-center gap-2 text-sm text-gray-700">
                          <input v-model="addVariationForm.trackInventory" type="checkbox" />
                          Track inventory
                        </label>
                        <label class="flex items-center gap-2 text-sm text-gray-700">
                          <input v-model="addVariationForm.sellable" type="checkbox" />
                          Sellable
                        </label>
                      </div>
                    </div>
                    <span v-if="addVariationForm.error" class="text-red-600 text-xs block">{{
                      addVariationForm.error
                    }}</span>
                    <div class="flex justify-end gap-3 pt-1">
                      <button
                        type="button"
                        class="text-gray-500 text-xs hover:underline"
                        @click="cancelAddVariation"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        class="btn-secondary px-3 py-1 text-xs"
                        :disabled="addVariationForm.saving"
                        @click="addVariation"
                      >
                        {{ addVariationForm.saving ? 'Adding…' : 'Add Variation' }}
                      </button>
                    </div>
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
                  <button
                    type="submit"
                    class="btn-primary px-5 py-2"
                    :disabled="
                      saving ||
                      uploadingImage ||
                      newCategory.saving ||
                      addVariationForm.saving ||
                      editForm.variations.some(
                        v => v.uploadingImage || v.correctingCount || v.deleting
                      )
                    "
                  >
                    {{ saving ? 'Saving…' : 'Save Changes' }}
                  </button>
                </div>
              </div>
            </fieldset>
          </form>
        </template>
      </div>
    </div>
  </AdminDialog>

  <!-- Delete item confirm modal -->
  <AdminDialog :open="deleteModal.open" title="Catalog editor" @close="closeDeleteConfirm">
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
  </AdminDialog>
</template>
<script setup lang="ts">
import { useConfirmation } from '../../../composables/useConfirmation'
const { ask } = useConfirmation()
import AdminDialog from '../AdminDialog.vue'
import ProductImageUploader from './ProductImageUploader.vue'
import VariationEditor from './VariationEditor.vue'
import { ref, reactive, computed } from 'vue'
import type { StockRow, SquareCategory, VariationForm } from './types'
import { squareAdminApi } from '../../../services/squareAdminApi'
import { STORE_INFO } from '../../../config/storeInfo'
const props = defineProps<{ categories: SquareCategory[] }>()
const categories = computed(() => props.categories)
const emit = defineEmits<{ refresh: []; 'categories-changed': [] }>()
const fetchRows = async () => {
  emit('refresh')
}
const formatDate = (isoDateTime: string | null) =>
  isoDateTime
    ? new Date(isoDateTime).toLocaleDateString('en-US', {
        dateStyle: 'medium',
        timeZone: STORE_INFO.timeZone,
      })
    : ''

// ── Edit modal ────────────────────────────────────────────────────────────────
const editModal = reactive({ open: false, itemId: '' })
const editLoading = ref(false)
const productLoaded = ref(false)
const editError = ref('')
const saving = ref(false)
const editForm = reactive({
  name: '',
  description: '',
  categoryId: '',
  hiddenFromWeb: false,
  releasedAt: '',
  itemCreatedAt: null as string | null,
  imageUrl: '' as string | null,
  variations: [] as VariationForm[],
})

const toVariationForm = (variation: {
  id: string
  name: string | null
  sku: string | null
  priceCents: number | null
  costCents: number | null
  trackInventory: boolean
  sellable: boolean
  quantity: number | null
  imageUrl?: string | null
  hasOwnImage?: boolean
}): VariationForm => ({
  id: variation.id,
  name: variation.name || '',
  sku: variation.sku,
  price: variation.priceCents != null ? variation.priceCents / 100 : 0,
  cost: variation.costCents != null ? (variation.costCents / 100).toFixed(2) : '',
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
  imageUrl: variation.imageUrl ?? null,
  hasOwnImage: variation.hasOwnImage ?? false,
  uploadingImage: false,
})

const openEdit = async (row: StockRow) => {
  if (editLoading.value || saving.value) return
  editModal.itemId = row.itemId
  editModal.open = true
  productLoaded.value = false
  editLoading.value = true
  editError.value = ''
  resetAddVariationForm()
  try {
    const data = await squareAdminApi.getProduct(row.itemId)
    const { item } = data
    productLoaded.value = true
    editForm.name = item.name || ''
    editForm.description = item.description || ''
    editForm.categoryId = item.categories?.[0]?.id || ''
    editForm.hiddenFromWeb = item.hiddenFromWeb ?? false
    editForm.releasedAt = item.releasedAt || ''
    editForm.itemCreatedAt = item.itemCreatedAt || null
    editForm.imageUrl = item.imageUrl || null
    editForm.variations = (item.variations || []).map(toVariationForm)
  } catch (e) {
    editError.value = e instanceof Error ? e.message : 'Failed to load product details'
  } finally {
    editLoading.value = false
  }
}

const closeEdit = () => {
  if (
    saving.value ||
    newCategory.saving ||
    uploadingImage.value ||
    editLoading.value ||
    deleteModal.deleting ||
    addVariationForm.saving ||
    editForm.variations.some(v => v.uploadingImage || v.correctingCount || v.deleting)
  )
    return
  editModal.open = false
  cancelNewCategory()
}

const saveEdit = async () => {
  if (
    saving.value ||
    !productLoaded.value ||
    uploadingImage.value ||
    newCategory.saving ||
    addVariationForm.saving ||
    editForm.variations.some(v => v.uploadingImage || v.correctingCount || v.deleting)
  )
    return
  if (editForm.categoryId === '__new__') {
    editError.value = 'Finish creating the new category first'
    return
  }
  saving.value = true
  editError.value = ''
  try {
    await squareAdminApi.updateProduct(editModal.itemId, {
      name: editForm.name,
      description: editForm.description,
      categoryIds: editForm.categoryId ? [editForm.categoryId] : [],
      hiddenFromWeb: editForm.hiddenFromWeb,
      releasedAt: editForm.releasedAt || null,
      variations: editForm.variations.map(v => ({
        id: v.id,
        name: v.name,
        priceCents: Math.round(v.price * 100),
        trackInventory: v.trackInventory,
        sellable: v.sellable,
        costCents: v.cost.trim() !== '' ? Math.round(parseFloat(v.cost) * 100) : null,
      })),
    })
    await fetchRows()
    saving.value = false
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
  if (newCategory.saving) return
  if (!newCategory.name.trim()) {
    newCategory.error = 'Name is required'
    return
  }
  newCategory.saving = true
  newCategory.error = ''
  try {
    const data = await squareAdminApi.createCategory({
      name: newCategory.name.trim(),
      parentCategoryId: newCategory.parentId || undefined,
    })
    const { category } = data
    emit('categories-changed')
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

const uploadingImage = ref(false)

// ── Add Variation ─────────────────────────────────────────────────────────────
// Only new-variation form allows setting a SKU — the edit path above locks it
// on existing variations to protect already-scanned in-store barcodes; a
// brand-new variation has no barcode yet, so there's nothing to protect.
const addVariationForm = reactive({
  open: false,
  name: '',
  sku: '',
  price: '' as string,
  trackInventory: false,
  sellable: true,
  saving: false,
  error: '',
})

const resetAddVariationForm = () => {
  addVariationForm.open = false
  addVariationForm.name = ''
  addVariationForm.sku = ''
  addVariationForm.price = ''
  addVariationForm.trackInventory = false
  addVariationForm.sellable = true
  addVariationForm.saving = false
  addVariationForm.error = ''
}

const cancelAddVariation = () => resetAddVariationForm()

const addVariation = async () => {
  if (addVariationForm.saving) return
  if (!addVariationForm.name.trim()) {
    addVariationForm.error = 'Name is required'
    return
  }
  addVariationForm.saving = true
  addVariationForm.error = ''
  try {
    const price = parseFloat(addVariationForm.price)
    const data = await squareAdminApi.addVariation(editModal.itemId, {
      name: addVariationForm.name.trim(),
      sku: addVariationForm.sku.trim() || undefined,
      priceCents:
        addVariationForm.price.trim() !== '' && !Number.isNaN(price)
          ? Math.round(price * 100)
          : null,
      trackInventory: addVariationForm.trackInventory,
      sellable: addVariationForm.sellable,
    })
    const { item } = data
    editForm.variations = (item.variations || []).map(toVariationForm)
    resetAddVariationForm()
  } catch (e) {
    addVariationForm.error = e instanceof Error ? e.message : 'Failed to add variation'
  } finally {
    addVariationForm.saving = false
  }
}

// ── Per-variation inventory correction ────────────────────────────────────────
const correctInventory = async (variation: VariationForm) => {
  if (variation.correctingCount) return
  variation.correctingCount = true
  variation.inventoryError = ''
  variation.inventorySuccess = false
  try {
    if (
      !(await ask(
        `Set ${variation.name || 'this variation'} on-hand inventory to ${variation.correctedQuantity}?`
      ))
    )
      return
    await squareAdminApi.updateInventory(editModal.itemId, {
      variationId: variation.id,
      quantity: variation.correctedQuantity,
    })
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
  if (variation.deleting) return
  variation.deleting = true
  variation.deleteError = ''
  try {
    await squareAdminApi.deleteVariation(editModal.itemId, variation.id)
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
const editorBusy = computed(
  () =>
    saving.value ||
    uploadingImage.value ||
    newCategory.saving ||
    addVariationForm.saving ||
    editForm.variations.some(v => v.uploadingImage || v.correctingCount || v.deleting)
)

const deleteModal = reactive({ open: false, confirmText: '', deleting: false, error: '' })

const openDeleteConfirm = () => {
  deleteModal.open = true
  deleteModal.confirmText = ''
  deleteModal.error = ''
}

const closeDeleteConfirm = () => {
  if (deleteModal.deleting) return
  deleteModal.open = false
}

const confirmDelete = async () => {
  if (deleteModal.deleting || deleteModal.confirmText !== editForm.name) return
  deleteModal.deleting = true
  deleteModal.error = ''
  try {
    await squareAdminApi.deleteProduct(editModal.itemId)
    deleteModal.deleting = false
    closeDeleteConfirm()
    closeEdit()
    await fetchRows()
  } catch (e) {
    deleteModal.error = e instanceof Error ? e.message : 'Delete failed'
  } finally {
    deleteModal.deleting = false
  }
}

defineExpose({ openEdit })
</script>
