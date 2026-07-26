<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="container mx-auto px-4">
      <div class="max-w-2xl mx-auto">
        <!-- Header -->
        <div class="flex justify-between items-center mb-8">
          <div>
            <h1 class="font-cinzel text-4xl font-bold text-gray-800">Add Featured Item</h1>
            <p class="text-gray-600 mt-1">Add a new promoted item to the homepage carousel</p>
          </div>
          <router-link to="/x/outpostAdmin/featured-items" class="btn-secondary px-4 py-2">
            ← Manage Featured Items
          </router-link>
        </div>

        <!-- Success banner -->
        <transition name="slide-down">
          <div
            v-if="successMsg"
            class="mb-5 bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-green-700 font-medium"
          >
            ✓ {{ successMsg }}
          </div>
        </transition>

        <!-- Form -->
        <form class="card space-y-5" @submit.prevent="handleSubmit">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              v-model="form.title"
              type="text"
              required
              class="input-field"
              placeholder="e.g., Featured: Reality Fracture"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
            <input
              v-model="form.subtitle"
              type="text"
              class="input-field"
              placeholder="e.g., Now available in store"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Image URL *</label>
            <input
              v-model="form.imageUrl"
              type="text"
              required
              class="input-field"
              placeholder="/wpn-assets/... or an uploaded image path"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Link To *</label>
              <input
                v-model="form.linkTo"
                type="text"
                required
                class="input-field"
                placeholder="/products"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Link Text</label>
              <input
                v-model="form.linkText"
                type="text"
                class="input-field"
                placeholder="Shop Now"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Game <span class="text-gray-400">(Optional)</span></label
            >
            <select v-model="form.gameTag" class="input-field">
              <option value="">No specific game</option>
              <option v-for="g in gameTagOptions" :key="g" :value="g">{{ g }}</option>
            </select>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label class="flex items-center gap-2 text-sm text-gray-700">
              <input v-model="form.isVisible" type="checkbox" class="accent-outpost-navy w-4 h-4" />
              Visible immediately
            </label>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
              <input v-model.number="form.sortOrder" type="number" class="input-field" />
            </div>
          </div>

          <div v-if="formError" class="text-red-600 text-sm">{{ formError }}</div>

          <div class="flex justify-end">
            <button type="submit" class="btn-primary px-6 py-2" :disabled="submitting">
              {{ submitting ? 'Adding…' : 'Add Featured Item' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useFeaturedItemsStore, type FeaturedItemGameTag } from '../../stores/featuredItems'

const store = useFeaturedItemsStore()

const gameTagOptions: FeaturedItemGameTag[] = [
  'magic',
  'pokemon',
  'onepiece',
  'gundam',
  'riftbound',
]

const submitting = ref(false)
const formError = ref('')
const successMsg = ref('')
let successTimer: ReturnType<typeof setTimeout> | null = null

const form = reactive({
  title: '',
  subtitle: '',
  imageUrl: '',
  linkTo: '',
  linkText: '',
  gameTag: '' as FeaturedItemGameTag | '',
  isVisible: true,
  sortOrder: 0,
})

const resetForm = () => {
  form.title = ''
  form.subtitle = ''
  form.imageUrl = ''
  form.linkTo = ''
  form.linkText = ''
  form.gameTag = ''
  form.isVisible = true
  form.sortOrder = 0
}

const handleSubmit = async () => {
  formError.value = ''
  submitting.value = true
  try {
    await store.addFeaturedItem({
      title: form.title,
      subtitle: form.subtitle,
      imageUrl: form.imageUrl,
      linkTo: form.linkTo,
      linkText: form.linkText || 'Learn More',
      gameTag: form.gameTag || undefined,
      isVisible: form.isVisible,
      sortOrder: form.sortOrder,
    })
    const title = form.title
    resetForm()
    successMsg.value = `"${title}" added successfully.`
    if (successTimer) clearTimeout(successTimer)
    successTimer = setTimeout(() => {
      successMsg.value = ''
    }, 4000)
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Failed to add featured item'
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
  transition:
    box-shadow 0.15s,
    border-color 0.15s;
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
