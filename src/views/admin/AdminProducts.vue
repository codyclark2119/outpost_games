<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="container mx-auto px-4">
      <div class="max-w-6xl mx-auto">
        <!-- Header -->
        <div class="flex flex-wrap justify-between items-center mb-8 gap-4">
          <div>
            <h1 class="font-cinzel text-4xl font-bold text-gray-800">Manage Products</h1>
            <p class="text-gray-600 mt-1">
              Toggle visibility, edit names, prices, and descriptions
            </p>
          </div>
          <div class="flex gap-3">
            <router-link to="/x/outpostAdmin/products/add" class="btn-primary px-4 py-2">
              + Add Items
            </router-link>
            <router-link to="/x/outpostAdmin" class="btn-secondary px-4 py-2">
              ← Dashboard
            </router-link>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="store.loading" class="text-center py-16">
          <div
            class="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-outpost-gold"
          ></div>
          <p class="mt-4 text-gray-600">Loading catalog…</p>
        </div>

        <!-- Error -->
        <div v-else-if="store.error" class="card text-center py-10">
          <p class="text-red-600 mb-4">{{ store.error }}</p>
          <button class="btn-primary px-6 py-2" @click="store.fetchCatalog()">Retry</button>
        </div>

        <!-- Catalog tree -->
        <div v-else class="space-y-3">
          <div
            v-for="type in store.catalog.types"
            :key="type.id"
            class="bg-white rounded-xl shadow border border-gray-200 overflow-hidden"
          >
            <!-- Type row -->
            <div
              class="flex items-center gap-3 px-4 py-3 bg-outpost-navy text-white cursor-pointer select-none"
              @click="toggleType(type.id)"
            >
              <span
                class="text-lg transition-transform duration-200"
                :class="expandedTypes.has(type.id) ? 'rotate-90' : ''"
                >▶</span
              >
              <span class="font-cinzel font-bold text-lg flex-1">{{ type.name }}</span>
              <span class="text-xs text-white/60">{{ type.sets.length }} sets</span>
              <!-- Visibility -->
              <button
                class="p-1.5 rounded transition-colors"
                :class="
                  type.isVisible
                    ? 'text-outpost-gold hover:text-outpost-gold-light'
                    : 'text-white/40 hover:text-white/70'
                "
                :title="type.isVisible ? 'Visible — click to hide' : 'Hidden — click to show'"
                @click.stop="toggleTypeVisibility(type)"
              >
                <EyeIcon v-if="type.isVisible" class="w-5 h-5" />
                <EyeSlashIcon v-else class="w-5 h-5" />
              </button>
              <!-- Edit -->
              <button
                class="p-1.5 rounded text-white/70 hover:text-white transition-colors"
                title="Edit type"
                @click.stop="openEditType(type)"
              >
                <PencilIcon class="w-4 h-4" />
              </button>
              <!-- Delete -->
              <button
                class="p-1.5 rounded text-white/40 hover:text-red-400 transition-colors"
                title="Delete type"
                @click.stop="confirmDeleteType(type)"
              >
                <TrashIcon class="w-4 h-4" />
              </button>
            </div>

            <!-- Sets -->
            <div v-if="expandedTypes.has(type.id)" class="divide-y divide-gray-100">
              <div v-for="set in type.sets" :key="set.id" class="bg-gray-50">
                <!-- Set row -->
                <div
                  class="flex items-center gap-3 px-6 py-2.5 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                  @click="toggleSet(set.id)"
                >
                  <span
                    class="text-sm text-gray-400 transition-transform duration-200"
                    :class="expandedSets.has(set.id) ? 'rotate-90' : ''"
                    >▶</span
                  >
                  <img
                    v-if="set.imageUrl"
                    :src="set.imageUrl"
                    :alt="set.name"
                    class="w-8 h-8 object-contain no-hover"
                  />
                  <div
                    v-else
                    class="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs"
                  >
                    ?
                  </div>
                  <span class="font-semibold text-gray-800 flex-1">{{ set.name }}</span>
                  <span class="text-xs text-gray-400">{{ set.products.length }} products</span>
                  <button
                    class="p-1.5 rounded transition-colors"
                    :class="
                      set.isVisible
                        ? 'text-outpost-gold hover:text-outpost-gold-dark'
                        : 'text-gray-300 hover:text-gray-500'
                    "
                    :title="set.isVisible ? 'Visible' : 'Hidden'"
                    @click.stop="toggleSetVisibility(set)"
                  >
                    <EyeIcon v-if="set.isVisible" class="w-4 h-4" />
                    <EyeSlashIcon v-else class="w-4 h-4" />
                  </button>
                  <button
                    class="p-1.5 rounded text-gray-400 hover:text-gray-700 transition-colors"
                    title="Edit set"
                    @click.stop="openEditSet(set)"
                  >
                    <PencilIcon class="w-4 h-4" />
                  </button>
                  <button
                    class="p-1.5 rounded text-gray-300 hover:text-red-400 transition-colors"
                    title="Delete set"
                    @click.stop="confirmDeleteSet(set)"
                  >
                    <TrashIcon class="w-4 h-4" />
                  </button>
                </div>

                <!-- Products table -->
                <div v-if="expandedSets.has(set.id)" class="bg-white border-t border-gray-100">
                  <div
                    v-if="set.products.length === 0"
                    class="px-16 py-4 text-sm text-gray-400 italic"
                  >
                    No products yet —
                    <router-link
                      :to="`/x/outpostAdmin/products/add?setId=${set.id}&typeId=${type.id}`"
                      class="text-outpost-gold underline"
                      >add one</router-link
                    >
                  </div>
                  <table v-else class="w-full text-sm">
                    <tbody>
                      <tr
                        v-for="product in set.products"
                        :key="product.id"
                        class="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                        :class="!product.isVisible ? 'opacity-50' : ''"
                      >
                        <td class="pl-16 pr-3 py-2 w-10">
                          <img
                            v-if="product.imageUrl"
                            :src="product.imageUrl"
                            :alt="product.name"
                            class="w-10 h-10 object-cover rounded no-hover"
                          />
                          <div
                            v-else
                            class="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-300"
                          >
                            <PhotoIcon class="w-5 h-5" />
                          </div>
                        </td>
                        <td class="px-3 py-2 font-medium text-gray-800">
                          {{ product.name }}
                          <span
                            v-if="!product.isVisible"
                            class="ml-2 text-xs text-gray-400 font-normal"
                            >(hidden)</span
                          >
                        </td>
                        <td class="px-3 py-2 text-gray-500 max-w-xs truncate hidden md:table-cell">
                          {{ product.description }}
                        </td>
                        <td class="px-3 py-2 text-gray-700 font-semibold whitespace-nowrap">
                          {{
                            product.price !== null ? `$${Number(product.price).toFixed(2)}` : '—'
                          }}
                        </td>
                        <td class="px-3 py-2 text-right">
                          <div class="flex items-center justify-end gap-1">
                            <button
                              class="p-1 rounded transition-colors"
                              :class="
                                product.isVisible
                                  ? 'text-outpost-gold hover:text-outpost-gold-dark'
                                  : 'text-gray-300 hover:text-gray-500'
                              "
                              :title="
                                product.isVisible
                                  ? 'Visible — click to hide'
                                  : 'Hidden — click to show'
                              "
                              @click="toggleProductVisibility(product)"
                            >
                              <EyeIcon v-if="product.isVisible" class="w-4 h-4" />
                              <EyeSlashIcon v-else class="w-4 h-4" />
                            </button>
                            <button
                              class="p-1 rounded text-gray-400 hover:text-gray-700 transition-colors"
                              title="Edit product"
                              @click="openEditProduct(product)"
                            >
                              <PencilIcon class="w-4 h-4" />
                            </button>
                            <button
                              class="p-1 rounded text-gray-300 hover:text-red-400 transition-colors"
                              title="Delete product"
                              @click="confirmDeleteProduct(product)"
                            >
                              <TrashIcon class="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div class="px-16 py-2 border-t border-gray-50">
                    <router-link
                      :to="`/x/outpostAdmin/products/add?setId=${set.id}&typeId=${type.id}`"
                      class="text-xs text-outpost-gold hover:underline"
                    >
                      + Add product to this set
                    </router-link>
                  </div>
                </div>
              </div>

              <!-- Add set link -->
              <div class="px-6 py-2 bg-gray-50">
                <router-link
                  :to="`/x/outpostAdmin/products/add?typeId=${type.id}`"
                  class="text-sm text-outpost-gold hover:underline"
                >
                  + Add set to {{ type.name }}
                </router-link>
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <div v-if="store.catalog.types.length === 0" class="card text-center py-12">
            <p class="text-gray-500 mb-4">No product types yet.</p>
            <router-link to="/x/outpostAdmin/products/add" class="btn-primary px-6 py-2"
              >Add First Type</router-link
            >
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <teleport to="body">
      <transition name="modal-fade">
        <div
          v-if="editModal.open"
          class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          @click.self="closeEditModal"
        >
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" @click.stop>
            <h2 class="font-cinzel text-xl font-bold mb-5 text-gray-800">
              Edit
              {{
                editModal.mode === 'type'
                  ? 'Game Type'
                  : editModal.mode === 'set'
                    ? 'Set'
                    : 'Product'
              }}
            </h2>

            <!-- Type form -->
            <div v-if="editModal.mode === 'type'" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input v-model="editForm.name" type="text" class="input-field" />
              </div>
            </div>

            <!-- Set form -->
            <div v-else-if="editModal.mode === 'set'" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input v-model="editForm.name" type="text" class="input-field" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Image URL (set symbol or banner)</label
                >
                <input
                  v-model="editForm.imageUrl"
                  type="text"
                  class="input-field"
                  placeholder="https://... (e.g. a Square product image URL)"
                />
                <img
                  v-if="editForm.imageUrl"
                  :src="editForm.imageUrl"
                  alt="preview"
                  class="mt-2 h-12 object-contain no-hover"
                />
              </div>
            </div>

            <!-- Product form -->
            <div v-else-if="editModal.mode === 'product'" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input v-model="editForm.name" type="text" class="input-field" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  v-model="editForm.description"
                  rows="2"
                  class="input-field resize-none"
                ></textarea>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                <input
                  v-model="editForm.price"
                  type="number"
                  step="0.01"
                  min="0"
                  class="input-field"
                  placeholder="Leave blank if no price"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input
                  v-model="editForm.imageUrl"
                  type="text"
                  class="input-field"
                  placeholder="https://..."
                />
                <img
                  v-if="editForm.imageUrl"
                  :src="editForm.imageUrl"
                  alt="preview"
                  class="mt-2 h-20 object-contain no-hover"
                />
              </div>
            </div>

            <div v-if="editError" class="mt-3 text-red-600 text-sm">{{ editError }}</div>

            <div class="flex gap-3 mt-6 justify-end">
              <button class="btn-secondary px-5 py-2" @click="closeEditModal">Cancel</button>
              <button class="btn-primary px-5 py-2" :disabled="saving" @click="saveEdit">
                {{ saving ? 'Saving…' : 'Save' }}
              </button>
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
            <h2 class="font-cinzel text-lg font-bold mb-3 text-gray-800">
              Delete "{{ deleteModal.name }}"?
            </h2>
            <p class="text-gray-600 text-sm mb-6">{{ deleteModal.message }}</p>
            <div class="flex gap-3 justify-center">
              <button class="btn-secondary px-5 py-2" @click="deleteModal.open = false">
                Cancel
              </button>
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
import { ref, reactive, onMounted } from 'vue'
import { EyeIcon, EyeSlashIcon, PencilIcon, TrashIcon, PhotoIcon } from '@heroicons/vue/24/outline'
import {
  useProductsStore,
  type ProductType,
  type ProductSet,
  type SetProduct,
} from '../../stores/products'

const store = useProductsStore()

const expandedTypes = ref(new Set<string>())
const expandedSets = ref(new Set<string>())

const toggleType = (id: string) => {
  if (expandedTypes.value.has(id)) expandedTypes.value.delete(id)
  else expandedTypes.value.add(id)
}
const toggleSet = (id: string) => {
  if (expandedSets.value.has(id)) expandedSets.value.delete(id)
  else expandedSets.value.add(id)
}

// Visibility toggles
const toggleTypeVisibility = async (type: ProductType) => {
  await store.updateType(type.id, { isVisible: !type.isVisible }).catch(() => {})
}
const toggleSetVisibility = async (set: ProductSet) => {
  await store.updateSet(set.id, { isVisible: !set.isVisible }).catch(() => {})
}
const toggleProductVisibility = async (product: SetProduct) => {
  await store.updateProduct(product.id, { isVisible: !product.isVisible }).catch(() => {})
}

// Edit modal
type EditMode = 'type' | 'set' | 'product'
const editModal = reactive<{ open: boolean; mode: EditMode; id: string }>({
  open: false,
  mode: 'type',
  id: '',
})
const editForm = reactive<{ name: string; imageUrl: string; description: string; price: string }>({
  name: '',
  imageUrl: '',
  description: '',
  price: '',
})
const editError = ref('')
const saving = ref(false)

const openEditType = (type: ProductType) => {
  editModal.mode = 'type'
  editModal.id = type.id
  editForm.name = type.name
  editModal.open = true
  editError.value = ''
}
const openEditSet = (set: ProductSet) => {
  editModal.mode = 'set'
  editModal.id = set.id
  editForm.name = set.name
  editForm.imageUrl = set.imageUrl || ''
  editModal.open = true
  editError.value = ''
}
const openEditProduct = (product: SetProduct) => {
  editModal.mode = 'product'
  editModal.id = product.id
  editForm.name = product.name
  editForm.description = product.description || ''
  editForm.price = product.price !== null ? String(product.price) : ''
  editForm.imageUrl = product.imageUrl || ''
  editModal.open = true
  editError.value = ''
}
const closeEditModal = () => {
  editModal.open = false
}

const saveEdit = async () => {
  if (!editForm.name.trim()) {
    editError.value = 'Name is required'
    return
  }
  saving.value = true
  editError.value = ''
  try {
    if (editModal.mode === 'type') {
      await store.updateType(editModal.id, { name: editForm.name.trim() })
    } else if (editModal.mode === 'set') {
      await store.updateSet(editModal.id, {
        name: editForm.name.trim(),
        imageUrl: editForm.imageUrl.trim() || null,
      })
    } else {
      const price = editForm.price.trim() !== '' ? parseFloat(editForm.price) : null
      await store.updateProduct(editModal.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        price,
        imageUrl: editForm.imageUrl.trim() || null,
      })
    }
    closeEditModal()
  } catch (e) {
    editError.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    saving.value = false
  }
}

// Delete modal
const deleteModal = reactive<{
  open: boolean
  name: string
  message: string
  fn: (() => Promise<void>) | null
}>({ open: false, name: '', message: '', fn: null })

const confirmDeleteType = (type: ProductType) => {
  deleteModal.name = type.name
  deleteModal.message = `This will permanently remove ${type.name} and all its sets and products.`
  deleteModal.fn = () => store.deleteType(type.id)
  deleteModal.open = true
}
const confirmDeleteSet = (set: ProductSet) => {
  deleteModal.name = set.name
  deleteModal.message = `This will permanently remove ${set.name} and all its products.`
  deleteModal.fn = () => store.deleteSet(set.id)
  deleteModal.open = true
}
const confirmDeleteProduct = (product: SetProduct) => {
  deleteModal.name = product.name
  deleteModal.message = `Tip: use the visibility toggle to hide it instead of deleting.`
  deleteModal.fn = () => store.deleteProduct(product.id)
  deleteModal.open = true
}

const executeDelete = async () => {
  if (!deleteModal.fn) return
  saving.value = true
  try {
    await deleteModal.fn()
    deleteModal.open = false
  } finally {
    saving.value = false
  }
}

onMounted(() => store.fetchCatalog())
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
