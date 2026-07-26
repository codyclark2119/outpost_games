<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="container mx-auto px-4">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="flex flex-wrap justify-between items-center mb-8 gap-4">
          <div>
            <h1 class="font-cinzel text-4xl font-bold text-gray-800">Manage Featured Items</h1>
            <p class="text-gray-600 mt-1">Controls the promoted-item carousel on the homepage</p>
          </div>
          <div class="flex gap-3">
            <router-link to="/x/outpostAdmin/featured-items/add" class="btn-primary px-4 py-2">
              + Add Featured Item
            </router-link>
            <router-link to="/x/outpostAdmin" class="btn-secondary px-4 py-2">
              ← Dashboard
            </router-link>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="store.loading && store.items.length === 0" class="text-center py-16">
          <div
            class="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-outpost-gold"
          ></div>
          <p class="mt-4 text-gray-600">Loading featured items…</p>
        </div>

        <!-- Error -->
        <div v-else-if="store.error" class="card text-center py-10">
          <p class="text-red-600 mb-4">{{ store.error }}</p>
          <button class="btn-primary px-6 py-2" @click="store.fetchFeaturedItems()">Retry</button>
        </div>

        <template v-else>
          <!-- Empty state -->
          <div v-if="sortedItems.length === 0" class="card text-center py-12">
            <p class="text-gray-500 mb-4">No featured items yet.</p>
            <router-link to="/x/outpostAdmin/featured-items/add" class="btn-primary px-6 py-2">
              Add First Featured Item
            </router-link>
          </div>

          <!-- List -->
          <div v-else class="space-y-3">
            <div
              v-for="item in sortedItems"
              :key="item.id"
              class="bg-white rounded-xl shadow border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-outpost-gold transition-colors"
              :class="{ 'opacity-60': !item.isVisible }"
            >
              <!-- Thumbnail -->
              <div
                class="flex-shrink-0 w-20 h-20 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center"
              >
                <img
                  v-if="item.imageUrl"
                  :src="item.imageUrl"
                  :alt="item.title"
                  class="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              <!-- Details -->
              <div class="flex-grow min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <h3 class="font-cinzel font-bold text-lg text-gray-800">{{ item.title }}</h3>
                  <span
                    v-if="item.gameTag"
                    class="text-xs px-2 py-0.5 rounded-full font-medium bg-outpost-navy/10 text-outpost-navy"
                  >
                    {{ item.gameTag }}
                  </span>
                  <span
                    v-if="!item.isVisible"
                    class="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-200 text-gray-600"
                  >
                    Hidden
                  </span>
                </div>
                <p class="text-gray-500 text-sm mt-1 line-clamp-1">{{ item.subtitle }}</p>
                <p class="text-gray-400 text-xs mt-1">→ {{ item.linkTo }}</p>
              </div>

              <!-- Inline controls -->
              <div class="flex items-center gap-4 flex-shrink-0">
                <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    :checked="item.isVisible"
                    class="accent-outpost-navy w-4 h-4"
                    @change="toggleVisible(item)"
                  />
                  Visible
                </label>
                <div class="flex items-center gap-1">
                  <span class="text-xs text-gray-500">Order</span>
                  <input
                    type="number"
                    :value="item.sortOrder"
                    class="input-field !w-16 !py-1 text-center"
                    @change="updateSortOrder(item, $event)"
                  />
                </div>
              </div>

              <!-- Actions -->
              <div class="flex gap-2 flex-shrink-0 sm:flex-col">
                <button
                  class="px-4 py-1.5 bg-outpost-navy text-white rounded-lg hover:bg-outpost-navy-light text-sm font-medium transition-colors"
                  @click="openEdit(item)"
                >
                  Edit
                </button>
                <button
                  class="px-4 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 text-sm font-medium transition-colors"
                  @click="confirmDelete(item)"
                >
                  Delete
                </button>
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
              <h2 class="font-cinzel text-xl font-bold mb-5 text-gray-800">Edit Featured Item</h2>

              <form class="space-y-4" @submit.prevent="saveEdit">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input v-model="editForm.title" type="text" required class="input-field" />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                  <input v-model="editForm.subtitle" type="text" class="input-field" />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                  <input v-model="editForm.imageUrl" type="text" required class="input-field" />
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Link To</label>
                    <input v-model="editForm.linkTo" type="text" required class="input-field" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Link Text</label>
                    <input v-model="editForm.linkText" type="text" class="input-field" />
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1"
                    >Game (Optional)</label
                  >
                  <select v-model="editForm.gameTag" class="input-field">
                    <option value="">No specific game</option>
                    <option v-for="g in gameTagOptions" :key="g" :value="g">{{ g }}</option>
                  </select>
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
            <h2 class="font-cinzel text-lg font-bold mb-2 text-gray-800">Delete Featured Item?</h2>
            <p class="text-gray-600 text-sm mb-6">
              "{{ deleteModal.title }}" will be permanently removed.
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
import { ref, reactive, computed, onMounted } from 'vue'
import {
  useFeaturedItemsStore,
  type FeaturedItem,
  type FeaturedItemGameTag,
} from '../../stores/featuredItems'

const store = useFeaturedItemsStore()

const gameTagOptions: FeaturedItemGameTag[] = [
  'magic',
  'pokemon',
  'onepiece',
  'gundam',
  'riftbound',
]

// Admin list shows everything (including hidden), sorted by sortOrder — unlike
// the public-facing visibleSorted computed, which filters to isVisible only.
const sortedItems = computed(() => [...store.items].sort((a, b) => a.sortOrder - b.sortOrder))

const saving = ref(false)

const toggleVisible = async (item: FeaturedItem) => {
  await store.updateFeaturedItem(item.id, { isVisible: !item.isVisible }).catch(() => {})
}

const updateSortOrder = async (item: FeaturedItem, event: Event) => {
  const value = Number((event.target as HTMLInputElement).value)
  if (Number.isNaN(value)) return
  await store.updateFeaturedItem(item.id, { sortOrder: value }).catch(() => {})
}

// ── Edit modal ────────────────────────────────────────────────────────────────
const editModal = reactive({ open: false, id: '' })
const editForm = reactive({
  title: '',
  subtitle: '',
  imageUrl: '',
  linkTo: '',
  linkText: '',
  gameTag: '' as FeaturedItemGameTag | '',
})
const editError = ref('')

const openEdit = (item: FeaturedItem) => {
  editModal.id = item.id
  editForm.title = item.title
  editForm.subtitle = item.subtitle
  editForm.imageUrl = item.imageUrl
  editForm.linkTo = item.linkTo
  editForm.linkText = item.linkText
  editForm.gameTag = item.gameTag ?? ''
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
    await store.updateFeaturedItem(editModal.id, {
      title: editForm.title,
      subtitle: editForm.subtitle,
      imageUrl: editForm.imageUrl,
      linkTo: editForm.linkTo,
      linkText: editForm.linkText,
      gameTag: editForm.gameTag || undefined,
    })
    closeEdit()
  } catch (e) {
    editError.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    saving.value = false
  }
}

// ── Delete modal ──────────────────────────────────────────────────────────────
const deleteModal = reactive({ open: false, id: '', title: '' })

const confirmDelete = (item: FeaturedItem) => {
  deleteModal.id = item.id
  deleteModal.title = item.title
  deleteModal.open = true
}

const executeDelete = async () => {
  saving.value = true
  try {
    await store.deleteFeaturedItem(deleteModal.id)
    deleteModal.open = false
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  store.fetchFeaturedItems()
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
