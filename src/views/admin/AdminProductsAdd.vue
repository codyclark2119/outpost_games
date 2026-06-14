<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="container mx-auto px-4">
      <div class="max-w-2xl mx-auto">
        <!-- Header -->
        <div class="flex justify-between items-center mb-8">
          <div>
            <h1 class="font-cinzel text-4xl font-bold text-gray-800">Add Products</h1>
            <p class="text-gray-600 mt-1">Add a new game type, set, or product to the catalog</p>
          </div>
          <router-link to="/x/outpostAdmin/products" class="btn-secondary px-4 py-2">
            ← Manage Products
          </router-link>
        </div>

        <!-- What to add selector -->
        <div class="card-mtg mb-6">
          <h2 class="font-cinzel text-lg font-bold mb-4 text-gray-800">What are you adding?</h2>
          <div class="grid grid-cols-3 gap-3">
            <button
              v-for="opt in addOptions"
              :key="opt.value"
              class="p-4 rounded-xl border-2 text-center transition-all duration-200 font-semibold text-sm"
              :class="
                addMode === opt.value
                  ? 'border-outpost-gold bg-outpost-gold/10 text-outpost-gold'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-outpost-gold/50'
              "
              @click="setMode(opt.value)"
            >
              <div class="text-2xl mb-1">{{ opt.icon }}</div>
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- Success banner -->
        <transition name="slide-down">
          <div v-if="successMsg" class="mb-4 bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-green-700 font-medium">
            ✓ {{ successMsg }}
          </div>
        </transition>

        <!-- Add Game Type form -->
        <form v-if="addMode === 'type'" class="card-mtg space-y-5" @submit.prevent="submitType">
          <h2 class="font-cinzel text-xl font-bold text-gray-800">New Game Type</h2>
          <p class="text-sm text-gray-500">A "game type" is the top-level category (e.g., Magic: The Gathering, Pokémon).</p>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              v-model="typeForm.name"
              type="text"
              required
              class="input-field"
              placeholder="e.g., Pokémon"
            />
          </div>
          <div v-if="formError" class="text-red-600 text-sm">{{ formError }}</div>
          <div class="flex justify-end">
            <button type="submit" class="btn-primary px-6 py-2" :disabled="saving">
              {{ saving ? 'Adding…' : 'Add Game Type' }}
            </button>
          </div>
        </form>

        <!-- Add Set form -->
        <form v-else-if="addMode === 'set'" class="card-mtg space-y-5" @submit.prevent="submitSet">
          <h2 class="font-cinzel text-xl font-bold text-gray-800">New Set</h2>
          <p class="text-sm text-gray-500">A "set" is a release or expansion (e.g., Tarkir: Dragonstorm, Scarlet &amp; Violet).</p>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Game Type *</label>
            <select v-model="setForm.typeId" required class="input-field">
              <option value="" disabled>Select a game type…</option>
              <option v-for="t in store.catalog.types" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Set Name *</label>
            <input
              v-model="setForm.name"
              type="text"
              required
              class="input-field"
              placeholder="e.g., Tarkir: Dragonstorm"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Image URL <span class="text-gray-400">(set symbol or banner)</span></label>
            <input
              v-model="setForm.imageUrl"
              type="text"
              class="input-field"
              placeholder="/wpn-assets/... or https://..."
            />
            <img v-if="setForm.imageUrl" :src="setForm.imageUrl" alt="preview" class="mt-2 h-14 object-contain no-hover" />
          </div>

          <div v-if="formError" class="text-red-600 text-sm">{{ formError }}</div>
          <div class="flex justify-end">
            <button type="submit" class="btn-primary px-6 py-2" :disabled="saving || !setForm.typeId">
              {{ saving ? 'Adding…' : 'Add Set' }}
            </button>
          </div>
        </form>

        <!-- Add Product form -->
        <form v-else-if="addMode === 'product'" class="card-mtg space-y-5" @submit.prevent="submitProduct">
          <h2 class="font-cinzel text-xl font-bold text-gray-800">New Product</h2>
          <p class="text-sm text-gray-500">A "product" is a specific item within a set (e.g., Booster Box, Elite Trainer Box, Commander Deck).</p>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Game Type *</label>
            <select v-model="productForm.typeId" required class="input-field" @change="productForm.setId = ''">
              <option value="" disabled>Select a game type…</option>
              <option v-for="t in store.catalog.types" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Set *</label>
            <select v-model="productForm.setId" required class="input-field" :disabled="!productForm.typeId">
              <option value="" disabled>Select a set…</option>
              <option
                v-for="s in setsForSelectedType"
                :key="s.id"
                :value="s.id"
              >
                {{ s.name }}
              </option>
            </select>
            <p v-if="productForm.typeId && setsForSelectedType.length === 0" class="text-sm text-amber-600 mt-1">
              No sets under this type yet —
              <button type="button" class="underline" @click="setMode('set')">add a set first</button>.
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input
              v-model="productForm.name"
              type="text"
              required
              class="input-field"
              placeholder="e.g., Booster Box"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              v-model="productForm.description"
              rows="3"
              class="input-field resize-none"
              placeholder="e.g., 36-pack booster box"
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
            <input
              v-model="productForm.price"
              type="number"
              step="0.01"
              min="0"
              class="input-field"
              placeholder="e.g., 149.99"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
            <input
              v-model="productForm.imageUrl"
              type="text"
              class="input-field"
              placeholder="https://..."
            />
            <img v-if="productForm.imageUrl" :src="productForm.imageUrl" alt="preview" class="mt-2 h-24 object-contain no-hover" />
          </div>

          <div v-if="formError" class="text-red-600 text-sm">{{ formError }}</div>
          <div class="flex justify-end">
            <button
              type="submit"
              class="btn-primary px-6 py-2"
              :disabled="saving || !productForm.typeId || !productForm.setId"
            >
              {{ saving ? 'Adding…' : 'Add Product' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useProductsStore } from '../../stores/products'

const store = useProductsStore()
const route = useRoute()

type AddMode = 'type' | 'set' | 'product'
const addMode = ref<AddMode>('product')

const addOptions = [
  { value: 'type' as const, label: 'Game Type', icon: '🎮' },
  { value: 'set' as const, label: 'Set / Release', icon: '📦' },
  { value: 'product' as const, label: 'Product', icon: '🃏' },
]

const saving = ref(false)
const formError = ref('')
const successMsg = ref('')
let successTimer: ReturnType<typeof setTimeout> | null = null

const showSuccess = (msg: string) => {
  successMsg.value = msg
  if (successTimer) clearTimeout(successTimer)
  successTimer = setTimeout(() => { successMsg.value = '' }, 4000)
}

const setMode = (mode: AddMode) => {
  addMode.value = mode
  formError.value = ''
  successMsg.value = ''
}

// Type form
const typeForm = reactive({ name: '' })

const submitType = async () => {
  formError.value = ''
  saving.value = true
  try {
    const t = await store.addType(typeForm.name.trim())
    typeForm.name = ''
    showSuccess(`Game type "${t.name}" added successfully.`)
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Failed to add type'
  } finally {
    saving.value = false
  }
}

// Set form
const setForm = reactive({ typeId: '', name: '', imageUrl: '' })

const submitSet = async () => {
  formError.value = ''
  saving.value = true
  try {
    const s = await store.addSet(setForm.typeId, {
      name: setForm.name.trim(),
      imageUrl: setForm.imageUrl.trim() || undefined,
    })
    setForm.name = ''
    setForm.imageUrl = ''
    showSuccess(`Set "${s.name}" added successfully.`)
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Failed to add set'
  } finally {
    saving.value = false
  }
}

// Product form
const productForm = reactive({ typeId: '', setId: '', name: '', description: '', price: '', imageUrl: '' })

const setsForSelectedType = computed(() => {
  if (!productForm.typeId) return []
  return store.catalog.types.find(t => t.id === productForm.typeId)?.sets ?? []
})

const submitProduct = async () => {
  formError.value = ''
  saving.value = true
  try {
    const price = productForm.price.trim() !== '' ? parseFloat(productForm.price) : null
    const p = await store.addProduct(productForm.setId, {
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      price,
      imageUrl: productForm.imageUrl.trim() || undefined,
    })
    productForm.name = ''
    productForm.description = ''
    productForm.price = ''
    productForm.imageUrl = ''
    showSuccess(`Product "${p.name}" added successfully.`)
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Failed to add product'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (store.catalog.types.length === 0) await store.fetchCatalog()

  // Pre-fill from query params (when linked from management page)
  const { typeId, setId } = route.query
  if (setId && typeof setId === 'string') {
    addMode.value = 'product'
    productForm.setId = setId
    if (typeId && typeof typeId === 'string') productForm.typeId = typeId
  } else if (typeId && typeof typeId === 'string') {
    addMode.value = 'set'
    setForm.typeId = typeId
  }
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
