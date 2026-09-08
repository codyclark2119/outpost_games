<template>
  <!-- Manage Categories panel -->
  <AdminDialog :open="categoryPanel.open" title="Catalog editor" @close="closeCategoryPanel">
    <div
      class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto"
      @click.stop
    >
      <div class="p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="font-cinzel text-xl font-bold text-gray-800">Manage Categories</h2>
          <button
            type="button"
            class="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Close categories"
            @click="closeCategoryPanel"
          >
            ✕
          </button>
        </div>

        <p v-if="error" class="text-red-600" role="alert">{{ error }}</p>
        <div v-else-if="categories.length === 0" class="text-gray-500 text-sm py-6 text-center">
          No categories yet.
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="cat in categories"
            :key="cat.id"
            class="border border-gray-200 rounded-lg p-3"
          >
            <div class="flex items-center gap-2 flex-wrap">
              <template v-if="categoryRow(cat.id).renaming">
                <input
                  v-model="categoryRow(cat.id).name"
                  type="text"
                  class="input-field !w-auto flex-1 min-w-[10rem]"
                />
                <button
                  type="button"
                  class="btn-primary px-3 py-1 text-xs"
                  :disabled="categoryRow(cat.id).saving"
                  @click="saveRename(cat)"
                >
                  {{ categoryRow(cat.id).saving ? 'Saving…' : 'Save' }}
                </button>
                <button
                  type="button"
                  class="text-gray-500 text-xs hover:underline"
                  @click="categoryRow(cat.id).renaming = false"
                >
                  Cancel
                </button>
              </template>
              <template v-else>
                <span class="font-medium text-gray-800 flex-1 min-w-[8rem]">{{
                  cat.path || cat.name
                }}</span>
                <button
                  type="button"
                  class="text-outpost-navy text-xs font-semibold hover:underline"
                  @click="startRename(cat)"
                >
                  Rename
                </button>
              </template>

              <select
                class="input-field !w-auto text-xs"
                :disabled="categoryRow(cat.id).saving"
                @change="onReparentChange(cat, $event)"
              >
                <option value="" disabled selected>Re-parent to…</option>
                <option value="__top__">Top-level (no parent)</option>
                <option
                  v-for="other in categories.filter(o => o.id !== cat.id)"
                  :key="other.id"
                  :value="other.id"
                >
                  {{ other.path || other.name }}
                </option>
              </select>

              <select
                class="input-field !w-auto text-xs"
                :disabled="categoryRow(cat.id).saving"
                @change="onMergeChange(cat, $event)"
              >
                <option value="" disabled selected>Merge into…</option>
                <option
                  v-for="other in categories.filter(o => o.id !== cat.id)"
                  :key="other.id"
                  :value="other.id"
                >
                  {{ other.path || other.name }}
                </option>
              </select>

              <button
                type="button"
                class="text-red-600 text-xs font-semibold hover:underline"
                :disabled="categoryRow(cat.id).saving"
                @click="deleteCategory(cat)"
              >
                Delete
              </button>
            </div>
            <p v-if="categoryRow(cat.id).error" class="text-red-600 text-xs mt-2">
              {{ categoryRow(cat.id).error }}
            </p>
            <p v-if="categoryRow(cat.id).success" class="text-green-600 text-xs mt-2">
              {{ categoryRow(cat.id).success }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </AdminDialog>
</template>
<script setup lang="ts">
import AdminDialog from '../AdminDialog.vue'
import { useConfirmation } from '../../../composables/useConfirmation'
const { ask: confirm } = useConfirmation()
import { reactive, computed } from 'vue'
import type { SquareCategory } from './types'
import { squareAdminApi } from '../../../services/squareAdminApi'
const props = defineProps<{ categories: SquareCategory[]; error: string }>()
const categories = computed(() => props.categories)
const emit = defineEmits<{ refresh: [] }>()
// ── Manage Categories panel ───────────────────────────────────────────────────
interface CategoryRowState {
  renaming: boolean
  name: string
  saving: boolean
  error: string
  success: string
}

const categoryPanel = reactive({ open: false })
const categoryRowStates = reactive(new Map<string, CategoryRowState>())

// Lazily-created per-category UI state, keyed by category id — most
// categories never get touched in a given visit to the panel, so there's no
// need to pre-populate state for every one up front.
const categoryRow = (categoryId: string): CategoryRowState => {
  let state = categoryRowStates.get(categoryId)
  if (!state) {
    state = { renaming: false, name: '', saving: false, error: '', success: '' }
    categoryRowStates.set(categoryId, state)
  }
  return state
}

const openCategoryPanel = () => {
  categoryPanel.open = true
}

const closeCategoryPanel = () => {
  if ([...categoryRowStates.values()].some(state => state.saving)) return
  categoryPanel.open = false
}

const startRename = (cat: SquareCategory) => {
  const state = categoryRow(cat.id)
  state.renaming = true
  state.name = cat.name || ''
  state.error = ''
  state.success = ''
}

const saveRename = async (cat: SquareCategory) => {
  const state = categoryRow(cat.id)
  if (!state.name.trim()) {
    state.error = 'Name is required'
    return
  }
  if (state.saving) return
  state.saving = true
  state.error = ''
  try {
    await squareAdminApi.renameCategory(cat.id, { name: state.name.trim() })
    state.renaming = false
    state.success = 'Category renamed.'
    emit('refresh')
  } catch (e) {
    state.error = e instanceof Error ? e.message : 'Rename failed'
  } finally {
    state.saving = false
  }
}

const onReparentChange = async (cat: SquareCategory, event: Event) => {
  const select = event.target as HTMLSelectElement
  const value = select.value
  select.value = ''
  if (!value) return

  const state = categoryRow(cat.id)
  if (state.saving) return
  state.saving = true
  state.error = ''
  state.success = ''
  try {
    const parentCategoryId = value === '__top__' ? null : value
    await squareAdminApi.reparentCategory(cat.id, { parentCategoryId })
    emit('refresh')
  } catch (e) {
    state.error = e instanceof Error ? e.message : 'Re-parent failed'
  } finally {
    state.saving = false
  }
}

const onMergeChange = async (cat: SquareCategory, event: Event) => {
  const select = event.target as HTMLSelectElement
  const toCategoryId = select.value
  select.value = ''
  if (!toCategoryId) return

  const target = categories.value.find(c => c.id === toCategoryId)
  const confirmed = await confirm(
    `Move every item in "${cat.path || cat.name}" into "${target?.path || target?.name}" and delete "${cat.path || cat.name}"?`
  )
  if (!confirmed) return

  const state = categoryRow(cat.id)
  if (state.saving) return
  state.saving = true
  state.error = ''
  state.success = ''
  try {
    await squareAdminApi.mergeCategory(cat.id, { toCategoryId })
    categoryRowStates.delete(cat.id)
    emit('refresh')
  } catch (e) {
    state.error = e instanceof Error ? e.message : 'Merge failed'
  } finally {
    state.saving = false
  }
}

const deleteCategory = async (cat: SquareCategory) => {
  if (
    !(await confirm(
      `Delete category "${cat.path || cat.name}"? This only works if no items or sub-categories still use it.`
    ))
  ) {
    return
  }

  const state = categoryRow(cat.id)
  if (state.saving) return
  state.saving = true
  state.error = ''
  state.success = ''
  try {
    await squareAdminApi.deleteCategory(cat.id)
    categoryRowStates.delete(cat.id)
    emit('refresh')
  } catch (e) {
    state.error = e instanceof Error ? e.message : 'Delete failed'
    state.saving = false
  }
}

defineExpose({ openCategoryPanel })
</script>
