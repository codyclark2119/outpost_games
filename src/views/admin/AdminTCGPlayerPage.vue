<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="container mx-auto px-4">
      <div class="max-w-6xl mx-auto">
        <!-- Header -->
        <div class="flex flex-wrap justify-between items-center mb-8 gap-4">
          <div>
            <h1 class="font-cinzel text-4xl font-bold text-gray-800">Manage Listings</h1>
            <p class="text-gray-600 mt-1">Edit and delete featured single card listings</p>
          </div>
          <div class="flex gap-3">
            <router-link to="/x/outpostAdmin/tcgplayer/add" class="btn-primary px-4 py-2">
              + Add Listing
            </router-link>
            <router-link to="/x/outpostAdmin" class="btn-secondary px-4 py-2">
              ← Dashboard
            </router-link>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading && listings.length === 0" class="text-center py-16">
          <div
            class="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-outpost-gold"
          ></div>
          <p class="mt-4 text-gray-600">Loading listings…</p>
        </div>

        <!-- Error -->
        <div v-else-if="fetchError" class="card-mtg text-center py-10">
          <p class="text-red-600 mb-4">{{ fetchError }}</p>
          <button class="btn-primary px-6 py-2" @click="fetchListings">Retry</button>
        </div>

        <template v-else>
          <!-- Count + clear all -->
          <div class="flex justify-between items-center mb-4">
            <p class="text-gray-600 text-sm">
              {{ listings.length }} listing{{ listings.length !== 1 ? 's' : '' }}
            </p>
            <button
              v-if="listings.length > 0"
              class="text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
              @click="clearAll"
            >
              Clear All Listings
            </button>
          </div>

          <!-- Empty state -->
          <div v-if="listings.length === 0" class="card-mtg text-center py-12">
            <p class="text-gray-500 mb-4">No listings yet.</p>
            <router-link to="/x/outpostAdmin/tcgplayer/add" class="btn-primary px-6 py-2">
              Add First Listing
            </router-link>
          </div>

          <!-- Listings grid -->
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div
              v-for="card in listings"
              :key="card.id"
              class="bg-white rounded-xl border border-gray-200 hover:border-outpost-gold transition-colors overflow-hidden flex flex-col"
            >
              <!-- Card image -->
              <div v-if="card.imageUrl" class="bg-gray-100 flex items-center justify-center p-2">
                <img
                  :src="card.imageUrl"
                  :alt="card.name"
                  class="h-32 object-contain no-hover"
                  @error="e => ((e.target as HTMLImageElement).style.display = 'none')"
                />
              </div>
              <div
                v-else
                class="h-20 bg-gray-100 flex items-center justify-center text-gray-300 text-sm"
              >
                No image
              </div>

              <!-- Info -->
              <div class="p-3 flex flex-col flex-grow">
                <h3 class="font-bold text-gray-900 text-sm leading-tight mb-0.5 line-clamp-2">
                  {{ card.name }}
                </h3>
                <p class="text-xs text-gray-500 mb-2 line-clamp-1">{{ card.setName }}</p>
                <div class="flex items-center gap-2 mb-3">
                  <span
                    class="text-xs px-2 py-0.5 rounded-full text-white font-semibold"
                    :class="{
                      'bg-green-500': card.condition === 'NM',
                      'bg-blue-500': card.condition === 'LP',
                      'bg-orange-400': card.condition === 'MP',
                      'bg-red-500': card.condition === 'HP',
                      'bg-gray-500': card.condition === 'DMG',
                    }"
                  >
                    {{ card.foiling }} / {{ card.condition }}
                  </span>
                </div>
                <p class="font-bold text-gray-900 mt-auto mb-3">
                  {{ card.priceDisplay || `$${card.price.toFixed(2)}` }}
                  <span class="text-xs font-normal text-gray-400 ml-1"
                    >· {{ card.quantityInStock }} in stock</span
                  >
                </p>
                <div class="flex gap-2">
                  <button
                    class="flex-1 py-1.5 bg-outpost-navy text-white rounded-lg text-xs font-semibold hover:bg-outpost-navy-light transition-colors"
                    @click="openEdit(card)"
                  >
                    Edit
                  </button>
                  <button
                    class="flex-1 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors"
                    @click="confirmDelete(card)"
                  >
                    Delete
                  </button>
                </div>
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
          <div
            class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            @click.stop
          >
            <div class="p-6">
              <h2 class="font-cinzel text-xl font-bold mb-5 text-gray-800">Edit Listing</h2>

              <form class="space-y-4" @submit.prevent="saveEdit">
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Card Name *</label>
                    <input v-model="editForm.name" type="text" required class="input-field" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Set Name *</label>
                    <input v-model="editForm.setName" type="text" required class="input-field" />
                  </div>
                </div>

                <div class="grid grid-cols-3 gap-3">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Price ($) *</label>
                    <input
                      v-model.number="editForm.price"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      class="input-field"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Condition *</label>
                    <select v-model="editForm.condition" required class="input-field">
                      <option value="NM">NM</option>
                      <option value="LP">LP</option>
                      <option value="MP">MP</option>
                      <option value="HP">HP</option>
                      <option value="DMG">DMG</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Foiling *</label>
                    <select v-model="editForm.foiling" required class="input-field">
                      <option value="Normal">Normal</option>
                      <option value="Foil">Foil</option>
                      <option value="Etched">Etched</option>
                    </select>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                    <input
                      v-model.number="editForm.quantityInStock"
                      type="number"
                      min="0"
                      required
                      class="input-field"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1"
                      >Price Display</label
                    >
                    <input
                      v-model="editForm.priceDisplay"
                      type="text"
                      class="input-field"
                      placeholder="e.g., See TCGPlayer"
                    />
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1"
                    >Image URL (Scryfall)</label
                  >
                  <input
                    v-model="editForm.imageUrl"
                    type="url"
                    class="input-field"
                    placeholder="https://cards.scryfall.io/..."
                  />
                  <img
                    v-if="editForm.imageUrl"
                    :src="editForm.imageUrl"
                    alt="preview"
                    class="mt-2 h-20 object-contain no-hover"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1"
                    >TCGPlayer Product URL *</label
                  >
                  <input v-model="editForm.productUrl" type="url" required class="input-field" />
                </div>

                <div v-if="editError" class="text-red-600 text-sm">{{ editError }}</div>

                <div class="flex gap-3 justify-end pt-2">
                  <button type="button" class="btn-secondary px-5 py-2" @click="closeEdit">
                    Cancel
                  </button>
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
            <h2 class="font-cinzel text-lg font-bold mb-2 text-gray-800">Delete Listing?</h2>
            <p class="text-gray-600 text-sm mb-6">
              "{{ deleteModal.name }}" will be permanently removed.
            </p>
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

interface CardListing {
  id: string
  name: string
  setName: string
  imageUrl?: string
  foiling: string
  condition: string
  price: number
  priceDisplay?: string
  quantityInStock: number
  productUrl: string
}

const API_URL = `${import.meta.env.VITE_API_URL || '/api'}/tcgplayer-listings`

const listings = ref<CardListing[]>([])
const loading = ref(false)
const fetchError = ref<string | null>(null)
const saving = ref(false)

const fetchListings = async () => {
  loading.value = true
  fetchError.value = null
  try {
    const res = await fetch(API_URL)
    if (!res.ok) throw new Error('Failed to fetch')
    const data = await res.json()
    listings.value = data.listings || []
  } catch (e) {
    fetchError.value = e instanceof Error ? e.message : 'Failed to load listings'
  } finally {
    loading.value = false
  }
}

// ── Edit modal ────────────────────────────────────────────────────────────────
const editModal = reactive({ open: false, id: '' })
const editForm = reactive({
  name: '',
  setName: '',
  price: 0,
  condition: 'NM',
  foiling: 'Normal',
  quantityInStock: 1,
  priceDisplay: '',
  imageUrl: '',
  productUrl: '',
})
const editError = ref('')

const openEdit = (card: CardListing) => {
  editModal.id = card.id
  editForm.name = card.name
  editForm.setName = card.setName
  editForm.price = card.price
  editForm.condition = card.condition
  editForm.foiling = card.foiling
  editForm.quantityInStock = card.quantityInStock
  editForm.priceDisplay = card.priceDisplay || ''
  editForm.imageUrl = card.imageUrl || ''
  editForm.productUrl = card.productUrl
  editError.value = ''
  editModal.open = true
}

const closeEdit = () => {
  editModal.open = false
}

const saveEdit = async () => {
  saving.value = true
  editError.value = ''
  try {
    const res = await fetch(`${API_URL}/${editModal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editForm.name,
        setName: editForm.setName,
        price: editForm.price,
        condition: editForm.condition,
        foiling: editForm.foiling,
        quantityInStock: editForm.quantityInStock,
        priceDisplay: editForm.priceDisplay || undefined,
        imageUrl: editForm.imageUrl || undefined,
        productUrl: editForm.productUrl,
      }),
    })
    if (!res.ok) throw new Error('Failed to save')
    await fetchListings()
    closeEdit()
  } catch (e) {
    editError.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    saving.value = false
  }
}

// ── Delete modal ──────────────────────────────────────────────────────────────
const deleteModal = reactive({ open: false, id: '', name: '' })

const confirmDelete = (card: CardListing) => {
  deleteModal.id = card.id
  deleteModal.name = card.name
  deleteModal.open = true
}

const executeDelete = async () => {
  saving.value = true
  try {
    await fetch(`${API_URL}/${deleteModal.id}`, { method: 'DELETE' })
    listings.value = listings.value.filter(c => c.id !== deleteModal.id)
    deleteModal.open = false
  } finally {
    saving.value = false
  }
}

// ── Clear all ─────────────────────────────────────────────────────────────────
const clearAll = async () => {
  if (!confirm('Delete ALL listings? This cannot be undone.')) return
  await fetch(API_URL, { method: 'DELETE' })
  listings.value = []
}

onMounted(fetchListings)
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
