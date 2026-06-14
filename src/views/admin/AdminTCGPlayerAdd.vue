<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="container mx-auto px-4">
      <div class="max-w-2xl mx-auto">

        <!-- Header -->
        <div class="flex justify-between items-center mb-8">
          <div>
            <h1 class="font-cinzel text-4xl font-bold text-gray-800">Add Listing</h1>
            <p class="text-gray-600 mt-1">Add a new single card to the featured listings</p>
          </div>
          <router-link to="/x/outpostAdmin/tcgplayer" class="btn-secondary px-4 py-2">
            ← Manage Listings
          </router-link>
        </div>

        <!-- Success banner -->
        <transition name="slide-down">
          <div v-if="successMsg" class="mb-5 bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-green-700 font-medium">
            ✓ {{ successMsg }}
          </div>
        </transition>

        <!-- Form -->
        <form class="card-mtg space-y-5" @submit.prevent="handleSubmit">

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Card Name *</label>
              <input v-model="form.name" type="text" required class="input-field" placeholder="e.g., Lightning Bolt" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Set Name *</label>
              <input v-model="form.setName" type="text" required class="input-field" placeholder="e.g., Modern Masters 2015" />
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Price ($) *</label>
              <input v-model.number="form.price" type="number" step="0.01" min="0" required class="input-field" placeholder="0.00" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Condition *</label>
              <select v-model="form.condition" required class="input-field">
                <option value="NM">Near Mint (NM)</option>
                <option value="LP">Lightly Played (LP)</option>
                <option value="MP">Moderately Played (MP)</option>
                <option value="HP">Heavily Played (HP)</option>
                <option value="DMG">Damaged (DMG)</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Foiling *</label>
              <select v-model="form.foiling" required class="input-field">
                <option value="Normal">Normal</option>
                <option value="Foil">Foil</option>
                <option value="Etched">Etched Foil</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Quantity in Stock *</label>
              <input v-model.number="form.quantityInStock" type="number" min="0" required class="input-field" placeholder="1" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Price Display <span class="text-gray-400">(Optional)</span></label>
              <input v-model="form.priceDisplay" type="text" class="input-field" placeholder='Leave blank to show actual price' />
              <p class="text-xs text-gray-400 mt-1">Override e.g. "See TCGPlayer"</p>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Card Image URL <span class="text-gray-400">(Scryfall)</span></label>
            <input v-model="form.imageUrl" type="url" class="input-field" placeholder="https://cards.scryfall.io/normal/front/..." />
            <p class="text-xs text-gray-400 mt-1">Find the card on <a href="https://scryfall.com" target="_blank" class="text-outpost-navy underline">scryfall.com</a> and copy the image URL</p>
            <img v-if="form.imageUrl" :src="form.imageUrl" alt="preview" class="mt-2 h-24 object-contain no-hover" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">TCGPlayer Product URL *</label>
            <input v-model="form.productUrl" type="url" required class="input-field" placeholder="https://www.tcgplayer.com/product/..." />
          </div>

          <div v-if="formError" class="text-red-600 text-sm">{{ formError }}</div>

          <div class="flex justify-end">
            <button type="submit" class="btn-primary px-6 py-2" :disabled="submitting">
              {{ submitting ? 'Adding…' : 'Add Listing' }}
            </button>
          </div>
        </form>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

const API_URL = `${import.meta.env.VITE_API_URL || '/api'}/tcgplayer-listings`

const submitting = ref(false)
const formError = ref('')
const successMsg = ref('')
let successTimer: ReturnType<typeof setTimeout> | null = null

const form = reactive({
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

const resetForm = () => {
  form.name = ''
  form.setName = ''
  form.price = 0
  form.condition = 'NM'
  form.foiling = 'Normal'
  form.quantityInStock = 1
  form.priceDisplay = ''
  form.imageUrl = ''
  form.productUrl = ''
}

const handleSubmit = async () => {
  formError.value = ''
  submitting.value = true
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        setName: form.setName,
        price: form.price,
        condition: form.condition,
        foiling: form.foiling,
        quantityInStock: form.quantityInStock,
        priceDisplay: form.priceDisplay || undefined,
        imageUrl: form.imageUrl || undefined,
        productUrl: form.productUrl,
      }),
    })
    if (!res.ok) throw new Error('Failed to add listing')
    const name = form.name
    resetForm()
    successMsg.value = `"${name}" added successfully.`
    if (successTimer) clearTimeout(successTimer)
    successTimer = setTimeout(() => { successMsg.value = '' }, 4000)
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Failed to add listing'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.input-field {
  width: 100%;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  transition: box-shadow 0.15s, border-color 0.15s;
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
