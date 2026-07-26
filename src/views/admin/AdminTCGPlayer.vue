<template>
  <div>
    <!-- Add/Edit Card Form -->
    <div class="card mb-8">
      <h2 class="font-cinzel text-2xl font-bold mb-6 text-gray-800">
        {{ editingCard ? 'Edit Card Listing' : 'Add New Card Listing' }}
      </h2>
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Card Name *</label>
            <input
              v-model="formData.name"
              type="text"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-outpost-navy focus:border-transparent"
              placeholder="e.g., Lightning Bolt"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Set Name *</label>
            <input
              v-model="formData.setName"
              type="text"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-outpost-navy focus:border-transparent"
              placeholder="e.g., Modern Masters 2015"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Price ($) *</label>
            <input
              v-model.number="formData.price"
              type="number"
              step="0.01"
              min="0"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-outpost-navy focus:border-transparent"
              placeholder="0.00"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Condition *</label>
            <select
              v-model="formData.condition"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-outpost-navy focus:border-transparent"
            >
              <option value="NM">Near Mint (NM)</option>
              <option value="LP">Lightly Played (LP)</option>
              <option value="MP">Moderately Played (MP)</option>
              <option value="HP">Heavily Played (HP)</option>
              <option value="DMG">Damaged (DMG)</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Foiling *</label>
            <select
              v-model="formData.foiling"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-outpost-navy focus:border-transparent"
            >
              <option value="Normal">Normal</option>
              <option value="Foil">Foil</option>
              <option value="Etched">Etched Foil</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Quantity in Stock *</label>
            <input
              v-model.number="formData.quantityInStock"
              type="number"
              min="0"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-outpost-navy focus:border-transparent"
              placeholder="0"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Price Display (Optional)
            </label>
            <input
              v-model="formData.priceDisplay"
              type="text"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-outpost-navy focus:border-transparent"
              placeholder="Leave empty to show actual price"
            />
            <p class="text-xs text-gray-500 mt-1">Override price display (e.g., "See TCGPlayer")</p>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Card Image URL (from Scryfall)
          </label>
          <input
            v-model="formData.imageUrl"
            type="url"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-outpost-navy focus:border-transparent"
            placeholder="https://cards.scryfall.io/normal/front/..."
          />
          <p class="text-xs text-gray-500 mt-1">
            Find card on
            <a href="https://scryfall.com" target="_blank" class="text-outpost-navy hover:underline"
              >Scryfall.com</a
            >
            and copy the image URL
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            TCGPlayer Product URL *
          </label>
          <input
            v-model="formData.productUrl"
            type="url"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-outpost-navy focus:border-transparent"
            placeholder="https://www.tcgplayer.com/product/..."
          />
          <p class="text-xs text-gray-500 mt-1">Direct link to the card on TCGPlayer</p>
        </div>

        <div class="flex gap-3">
          <button
            type="submit"
            :disabled="submitting || loading"
            class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ submitting ? 'Saving...' : editingCard ? 'Update Card' : 'Add Card' }}
          </button>
          <button
            v-if="editingCard"
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

    <!-- Card Listings -->
    <div class="card">
      <div class="flex justify-between items-center mb-6">
        <h2 class="font-cinzel text-2xl font-bold text-gray-800">
          Current Listings ({{ cardListings.length }})
        </h2>
        <button
          v-if="cardListings.length > 0"
          :disabled="loading"
          class="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
          @click="clearAllListings"
        >
          Clear All Listings
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading && cardListings.length === 0" class="text-center py-8">
        <div
          class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-outpost-navy"
        ></div>
        <p class="text-gray-500 mt-2">Loading listings...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-8">
        <p class="text-red-600 mb-4">{{ error }}</p>
        <button class="btn-primary" @click="fetchListings">Retry</button>
      </div>

      <!-- Empty State -->
      <div v-else-if="cardListings.length === 0" class="text-center py-8 text-gray-500">
        No card listings yet. Add your first card above!
      </div>

      <!-- Listings Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="card in cardListings"
          :key="card.id"
          class="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-outpost-gold transition-colors"
        >
          <div class="flex gap-3">
            <div v-if="card.imageUrl" class="flex-shrink-0">
              <img
                :src="card.imageUrl"
                :alt="card.name"
                class="w-20 h-28 object-cover rounded"
                @error="handleImageError"
              />
            </div>
            <div class="flex-grow min-w-0">
              <h3 class="font-bold text-gray-900 truncate" :title="card.name">{{ card.name }}</h3>
              <p class="text-sm text-gray-600 truncate" :title="card.setName">{{ card.setName }}</p>
              <div class="mt-2 space-y-1">
                <p class="text-xs text-gray-500">
                  <span class="font-medium">{{ card.foiling }}</span> /
                  <span class="font-medium">{{ card.condition }}</span>
                </p>
                <p class="text-lg font-bold text-gray-900">
                  {{ card.priceDisplay || `$${card.price.toFixed(2)}` }}
                </p>
                <p class="text-xs text-gray-500">Stock: {{ card.quantityInStock }}</p>
              </div>
            </div>
          </div>
          <div class="flex gap-2 mt-3">
            <button
              class="flex-1 px-3 py-1.5 bg-outpost-navy text-white rounded hover:bg-opacity-90 text-sm"
              @click="startEdit(card)"
            >
              Edit
            </button>
            <button
              class="flex-1 px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              @click="deleteCard(card.id)"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
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
  seller: string
  createdAt?: string
}

const API_URL = `${import.meta.env.VITE_API_URL || '/api'}/tcgplayer-listings`

const cardListings = ref<CardListing[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const submitting = ref(false)
const editingCard = ref<string | null>(null)

const formData = reactive({
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

const fetchListings = async () => {
  loading.value = true
  error.value = null
  try {
    const response = await fetch(API_URL)
    if (!response.ok) {
      throw new Error('Failed to fetch listings')
    }
    const data = await response.json()
    cardListings.value = data.listings || []
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'An error occurred'
    console.error('Error fetching listings:', err)
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  formData.name = ''
  formData.setName = ''
  formData.price = 0
  formData.condition = 'NM'
  formData.foiling = 'Normal'
  formData.quantityInStock = 1
  formData.priceDisplay = ''
  formData.imageUrl = ''
  formData.productUrl = ''
  editingCard.value = null
}

const handleSubmit = async () => {
  if (submitting.value) return

  submitting.value = true
  try {
    const cardData = {
      name: formData.name,
      setName: formData.setName,
      price: formData.price,
      condition: formData.condition,
      foiling: formData.foiling,
      quantityInStock: formData.quantityInStock,
      priceDisplay: formData.priceDisplay || undefined,
      imageUrl: formData.imageUrl || undefined,
      productUrl: formData.productUrl,
    }

    let response
    if (editingCard.value) {
      // Update existing card
      response = await fetch(`${API_URL}/${editingCard.value}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardData),
      })
    } else {
      // Add new card
      response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardData),
      })
    }

    if (!response.ok) {
      throw new Error('Failed to save card')
    }

    await fetchListings()
    resetForm()
  } catch (err) {
    console.error('Error submitting card:', err)
    alert('Failed to save card. Please try again.')
  } finally {
    submitting.value = false
  }
}

const startEdit = (card: CardListing) => {
  formData.name = card.name
  formData.setName = card.setName
  formData.price = card.price
  formData.condition = card.condition
  formData.foiling = card.foiling
  formData.quantityInStock = card.quantityInStock
  formData.priceDisplay = card.priceDisplay || ''
  formData.imageUrl = card.imageUrl || ''
  formData.productUrl = card.productUrl
  editingCard.value = card.id
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const cancelEdit = () => {
  resetForm()
}

const deleteCard = async (id: string) => {
  if (!confirm('Are you sure you want to delete this card listing?')) return

  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error('Failed to delete card')
    }

    await fetchListings()
  } catch (err) {
    console.error('Error deleting card:', err)
    alert('Failed to delete card. Please try again.')
  }
}

const clearAllListings = async () => {
  if (!confirm('Are you sure you want to delete ALL card listings? This cannot be undone.')) return

  try {
    const response = await fetch(API_URL, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error('Failed to clear listings')
    }

    await fetchListings()
  } catch (err) {
    console.error('Error clearing listings:', err)
    alert('Failed to clear listings. Please try again.')
  }
}

const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement
  target.style.display = 'none'
}

onMounted(() => {
  fetchListings()
})
</script>
