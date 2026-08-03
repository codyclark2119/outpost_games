<template>
  <div class="min-h-screen bg-gray-50 py-12 pb-28">
    <div class="container mx-auto px-4">
      <div class="max-w-6xl mx-auto">
        <!-- Header -->
        <div class="flex flex-wrap justify-between items-center mb-8 gap-4">
          <div>
            <h1 class="font-cinzel text-4xl font-bold text-gray-800">Square Catalog Editor</h1>
            <p class="text-gray-600 mt-1">Edit product details directly in Square POS</p>
          </div>
          <router-link :to="{ name: 'AdminDashboard' }" class="btn-secondary px-4 py-2">
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
        <div v-else-if="fetchError" class="card text-center py-10">
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
            <div class="flex items-center gap-3">
              <button
                type="button"
                class="btn-secondary px-4 py-2 text-sm whitespace-nowrap"
                @click="openCategoryPanel"
              >
                Manage Categories
              </button>
              <p class="text-gray-500 text-sm whitespace-nowrap">
                {{ filteredRows.length }} of {{ rows.length }} items
              </p>
            </div>
          </div>

          <div class="space-y-3">
            <div
              v-for="group in groupedFilteredRows"
              :key="group.name"
              class="bg-white rounded-xl shadow border border-gray-200 overflow-hidden"
            >
              <div class="flex items-center gap-3 px-4 py-3 bg-outpost-navy text-white select-none">
                <input
                  type="checkbox"
                  class="accent-outpost-gold"
                  :checked="groupSelectionState(group) === 'all'"
                  :indeterminate.prop="groupSelectionState(group) === 'some'"
                  @click.stop="toggleGroupSelection(group)"
                />
                <div
                  class="flex items-center gap-3 flex-1 cursor-pointer"
                  @click="toggleCategory(group.name)"
                >
                  <span
                    class="text-lg transition-transform duration-200"
                    :class="expandedCategories.has(group.name) ? 'rotate-90' : ''"
                    >▶</span
                  >
                  <span class="font-cinzel font-bold text-lg flex-1">{{ group.name }}</span>
                  <span class="text-xs text-white/60"
                    >{{ group.rows.length }} item{{ group.rows.length !== 1 ? 's' : '' }}</span
                  >
                </div>
              </div>

              <div v-if="expandedCategories.has(group.name)" class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr
                      class="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500"
                    >
                      <th class="px-4 py-3 w-8"></th>
                      <th class="px-4 py-3">Item</th>
                      <th class="px-4 py-3">SKU</th>
                      <th class="px-4 py-3 text-right">Price</th>
                      <th class="px-4 py-3 text-right">Qty</th>
                      <th class="px-4 py-3">Status</th>
                      <th class="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in group.rows"
                      :key="row.id"
                      class="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                      :class="{ 'bg-amber-50': selectedItemIds.has(row.itemId) }"
                    >
                      <td class="px-4 py-2.5">
                        <input
                          type="checkbox"
                          :checked="selectedItemIds.has(row.itemId)"
                          @change="toggleItemSelection(row.itemId)"
                        />
                      </td>
                      <td class="px-4 py-2.5 font-medium text-gray-800">{{ row.displayName }}</td>
                      <td class="px-4 py-2.5 text-gray-500">{{ row.sku || '—' }}</td>
                      <td class="px-4 py-2.5 text-right text-gray-700">
                        {{ formatPrice(row.priceCents) }}
                      </td>
                      <td class="px-4 py-2.5 text-right text-gray-700">
                        {{ row.quantity ?? '—' }}
                      </td>
                      <td class="px-4 py-2.5">
                        <span
                          class="text-xs px-2 py-0.5 rounded-full font-semibold"
                          :class="stockStatusClass(row)"
                        >
                          {{ stockStatusLabel(row) }}
                        </span>
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
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Sticky bulk-action bar -->
    <transition name="fade">
      <div
        v-if="selectedItemIds.size > 0"
        class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg py-4 z-20"
      >
        <div class="container mx-auto px-4">
          <div class="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <p class="text-sm text-gray-600">{{ selectedItemIds.size }} item(s) selected</p>
            <div class="flex flex-wrap gap-3 items-center">
              <select
                class="input-field !w-auto text-sm"
                :disabled="bulkAction.running"
                @change="onBulkCategoryChange($event)"
              >
                <option value="">Move to Category…</option>
                <option value="__none__">Uncategorized</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                  {{ cat.path || cat.name }}
                </option>
              </select>
              <select
                class="input-field !w-auto text-sm"
                :disabled="bulkAction.running"
                @change="onBulkVisibilityChange($event)"
              >
                <option value="">Toggle Visibility…</option>
                <option value="false">Visible</option>
                <option value="true">Hidden</option>
              </select>
              <select
                class="input-field !w-auto text-sm"
                :disabled="bulkAction.running"
                @change="onBulkSellableChange($event)"
              >
                <option value="">Toggle Sellable…</option>
                <option value="true">Sellable</option>
                <option value="false">Not Sellable</option>
              </select>
              <button
                type="button"
                class="text-red-600 text-sm font-semibold hover:underline"
                :disabled="bulkAction.running"
                @click="bulkDeleteModal.open = true"
              >
                Delete Selected
              </button>
              <button
                type="button"
                class="text-gray-500 text-sm hover:underline"
                :disabled="bulkAction.running"
                @click="clearSelection"
              >
                Clear
              </button>
            </div>
          </div>
          <p v-if="bulkAction.error" class="text-red-600 text-sm mt-2">{{ bulkAction.error }}</p>
        </div>
      </div>
    </transition>

    <!-- Bulk delete confirmation -->
    <teleport to="body">
      <transition name="modal-fade">
        <div
          v-if="bulkDeleteModal.open"
          class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          @click.self="bulkDeleteModal.open = false"
        >
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h2 class="font-cinzel text-xl font-bold mb-4 text-gray-800">
              Delete {{ selectedItemIds.size }} item(s)?
            </h2>
            <ul class="text-sm text-gray-700 list-disc pl-5 mb-3 max-h-40 overflow-y-auto">
              <li v-for="name in bulkDeletePreviewNames" :key="name">{{ name }}</li>
            </ul>
            <p v-if="selectedItemIds.size > 10" class="text-sm text-gray-500 mb-4">
              …and {{ selectedItemIds.size - 10 }} more
            </p>
            <label class="flex items-start gap-2 text-sm text-gray-700 mb-4">
              <input v-model="bulkDeleteModal.confirmed" type="checkbox" class="mt-0.5" />
              I understand this permanently deletes {{ selectedItemIds.size }} item(s) and all their
              variations.
            </label>
            <span v-if="bulkAction.error" class="text-red-600 text-sm block mb-3">{{
              bulkAction.error
            }}</span>
            <div class="flex justify-end gap-3">
              <button
                class="btn-secondary px-4 py-2"
                :disabled="bulkAction.running"
                @click="bulkDeleteModal.open = false"
              >
                Cancel
              </button>
              <button
                class="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
                :disabled="!bulkDeleteModal.confirmed || bulkAction.running"
                @click="confirmBulkDelete"
              >
                {{ bulkAction.running ? 'Deleting…' : 'Delete Permanently' }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </teleport>

    <!-- Manage Categories panel -->
    <teleport to="body">
      <transition name="modal-fade">
        <div
          v-if="categoryPanel.open"
          class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          @click.self="closeCategoryPanel"
        >
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
                  @click="closeCategoryPanel"
                >
                  ✕
                </button>
              </div>

              <div v-if="categories.length === 0" class="text-gray-500 text-sm py-6 text-center">
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
        </div>
      </transition>
    </teleport>

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

                        <!-- Variation image — falls back to the item's group
                             photo above until this variation has its own -->
                        <div>
                          <label class="block text-xs font-medium text-gray-500 mb-1">
                            Image
                            <span v-if="!variation.hasOwnImage" class="text-gray-400 font-normal"
                              >(using group photo)</span
                            >
                          </label>
                          <div class="flex items-center gap-2">
                            <img
                              v-if="variation.imageUrl"
                              :src="variation.imageUrl"
                              alt=""
                              class="h-12 w-12 object-cover rounded-lg border border-gray-200 no-hover"
                            />
                            <div
                              v-else
                              class="h-12 w-12 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-xs"
                            >
                              None
                            </div>
                            <div class="flex-1">
                              <input
                                :ref="el => setVariationImageInput(variation.id, el)"
                                type="file"
                                accept="image/jpeg,image/png,image/gif"
                                class="text-xs"
                                @change="onVariationImageSelected(variation, $event)"
                              />
                              <button
                                type="button"
                                class="btn-secondary px-2 py-0.5 text-xs mt-1"
                                :disabled="!variation.selectedImageFile || variation.uploadingImage"
                                @click="uploadVariationImage(variation)"
                              >
                                {{ variation.uploadingImage ? 'Uploading…' : 'Upload' }}
                              </button>
                              <span
                                v-if="variation.imageError"
                                class="text-red-600 text-xs block mt-1"
                                >{{ variation.imageError }}</span
                              >
                            </div>
                          </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
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
                          <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1"
                              >Unit Cost ($)
                              <span class="text-gray-400 font-normal">— for profit tracking</span>
                            </label>
                            <input
                              v-model="variation.cost"
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Not set"
                              class="input-field"
                            />
                          </div>
                        </div>

                        <p v-if="marginLabel(variation)" class="text-xs text-gray-500">
                          {{ marginLabel(variation) }}
                        </p>

                        <div class="flex gap-6 items-center">
                          <label class="flex items-center gap-2 text-sm text-gray-700">
                            <input v-model="variation.trackInventory" type="checkbox" />
                            Track inventory
                          </label>
                          <label class="flex items-center gap-2 text-sm text-gray-700">
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
                      <div
                        v-else
                        class="border border-dashed border-gray-300 rounded-lg p-3 space-y-2"
                      >
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
import { ref, reactive, computed, onMounted, type ComponentPublicInstance } from 'vue'

interface StockRow {
  id: string
  itemId: string
  displayName: string
  sku: string | null
  priceCents: number | null
  categoryId: string | null
  categoryName: string
  trackInventory: boolean
  quantity: number | null
  inStock: boolean
}

interface CategoryGroup {
  name: string
  rows: StockRow[]
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
  cost: string
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
  imageUrl: string | null
  hasOwnImage: boolean
  selectedImageFile: File | null
  uploadingImage: boolean
  imageError: string
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

// Grouped by top-level Square category so a large catalog can be scanned and
// edited section-by-section instead of one long flat table.
const groupedFilteredRows = computed((): CategoryGroup[] => {
  const byName = new Map<string, CategoryGroup>()
  for (const row of filteredRows.value) {
    const name = row.categoryName || 'Uncategorized'
    let group = byName.get(name)
    if (!group) {
      group = { name, rows: [] }
      byName.set(name, group)
    }
    group.rows.push(row)
  }
  return [...byName.values()].sort((a, b) => {
    if (a.name === 'Uncategorized') return 1
    if (b.name === 'Uncategorized') return -1
    return a.name.localeCompare(b.name)
  })
})

const expandedCategories = ref(new Set<string>())
const toggleCategory = (name: string) => {
  if (expandedCategories.value.has(name)) expandedCategories.value.delete(name)
  else expandedCategories.value.add(name)
}

const formatPrice = (cents: number | null) => (cents == null ? '—' : `$${(cents / 100).toFixed(2)}`)

// Same status convention as AdminSquareStock.vue's read-only report, so the
// two pages read consistently.
const stockStatusLabel = (row: StockRow) => {
  if (!row.trackInventory) return 'Not Tracked'
  return row.inStock ? 'In Stock' : 'Out of Stock'
}

const stockStatusClass = (row: StockRow) => {
  if (!row.trackInventory) return 'bg-gray-100 text-gray-500'
  return row.inStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
}

// Live margin preview while editing — blank until both price and cost are
// filled in, so an admin isn't shown a misleading 100% margin before they've
// entered a real cost.
const marginLabel = (variation: VariationForm) => {
  const cost = parseFloat(variation.cost)
  if (variation.cost.trim() === '' || Number.isNaN(cost) || !variation.price) return ''
  const profit = variation.price - cost
  const marginPct = (profit / variation.price) * 100
  return `Margin: $${profit.toFixed(2)} (${marginPct.toFixed(0)}%) per unit`
}

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

// ── Bulk selection & actions ──────────────────────────────────────────────────
// This list is one row per VARIATION (from getSquareInventoryReport), so a
// multi-variation item shows as multiple rows sharing one itemId — selection
// is keyed by itemId, not row id, so checking any one variation-row selects
// the whole item (every sibling row for that item reflects the same checked
// state automatically, since they all share the same itemId key).
const selectedItemIds = ref(new Set<string>())

const toggleItemSelection = (itemId: string) => {
  if (selectedItemIds.value.has(itemId)) selectedItemIds.value.delete(itemId)
  else selectedItemIds.value.add(itemId)
}

const clearSelection = () => {
  selectedItemIds.value.clear()
}

const groupSelectionState = (group: CategoryGroup): 'all' | 'some' | 'none' => {
  const itemIds = new Set(group.rows.map(row => row.itemId))
  const selectedCount = [...itemIds].filter(id => selectedItemIds.value.has(id)).length
  if (selectedCount === 0) return 'none'
  if (selectedCount === itemIds.size) return 'all'
  return 'some'
}

const toggleGroupSelection = (group: CategoryGroup) => {
  const itemIds = [...new Set(group.rows.map(row => row.itemId))]
  const allSelected = groupSelectionState(group) === 'all'
  for (const id of itemIds) {
    if (allSelected) selectedItemIds.value.delete(id)
    else selectedItemIds.value.add(id)
  }
}

const bulkAction = reactive({ running: false, error: '' })

const runBulkAction = async (path: string, body: Record<string, unknown>) => {
  bulkAction.running = true
  bulkAction.error = ''
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemIds: [...selectedItemIds.value], ...body }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Bulk action failed')
    clearSelection()
    await fetchRows()
  } catch (e) {
    bulkAction.error = e instanceof Error ? e.message : 'Bulk action failed'
  } finally {
    bulkAction.running = false
  }
}

const onBulkCategoryChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  if (!value) return
  const categoryId = value === '__none__' ? null : value
  ;(event.target as HTMLSelectElement).value = ''
  runBulkAction('/products/batch-category', { categoryId })
}

const onBulkVisibilityChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  if (!value) return
  ;(event.target as HTMLSelectElement).value = ''
  runBulkAction('/products/batch-visibility', { hiddenFromWeb: value === 'true' })
}

const onBulkSellableChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  if (!value) return
  ;(event.target as HTMLSelectElement).value = ''
  runBulkAction('/products/batch-visibility', { sellable: value === 'true' })
}

const bulkDeleteModal = reactive({ open: false, confirmed: false })

// Deduplicated display names for the confirmation modal — the list is
// per-variation, so the same itemId can appear multiple times.
const bulkDeletePreviewNames = computed(() => {
  const seen = new Set<string>()
  const names: string[] = []
  for (const row of rows.value) {
    if (!selectedItemIds.value.has(row.itemId) || seen.has(row.itemId)) continue
    seen.add(row.itemId)
    names.push(row.displayName)
    if (names.length >= 10) break
  }
  return names
})

const confirmBulkDelete = async () => {
  await runBulkAction('/products/batch-delete', {})
  bulkDeleteModal.open = false
  bulkDeleteModal.confirmed = false
}

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
  state.saving = true
  state.error = ''
  try {
    const res = await fetch(`${API_URL}/categories/${cat.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: state.name.trim() }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Rename failed')
    }
    state.renaming = false
    await Promise.all([fetchCategories(), fetchRows()])
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
  state.saving = true
  state.error = ''
  state.success = ''
  try {
    const parentCategoryId = value === '__top__' ? null : value
    const res = await fetch(`${API_URL}/categories/${cat.id}/parent`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentCategoryId }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Re-parent failed')
    }
    await Promise.all([fetchCategories(), fetchRows()])
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
  const confirmed = confirm(
    `Move every item in "${cat.path || cat.name}" into "${target?.path || target?.name}" and delete "${cat.path || cat.name}"?`
  )
  if (!confirmed) return

  const state = categoryRow(cat.id)
  state.saving = true
  state.error = ''
  state.success = ''
  try {
    const res = await fetch(`${API_URL}/categories/${cat.id}/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toCategoryId }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Merge failed')
    categoryRowStates.delete(cat.id)
    await Promise.all([fetchCategories(), fetchRows()])
  } catch (e) {
    state.error = e instanceof Error ? e.message : 'Merge failed'
  } finally {
    state.saving = false
  }
}

const deleteCategory = async (cat: SquareCategory) => {
  if (
    !confirm(
      `Delete category "${cat.path || cat.name}"? This only works if no items or sub-categories still use it.`
    )
  ) {
    return
  }

  const state = categoryRow(cat.id)
  state.saving = true
  state.error = ''
  state.success = ''
  try {
    const res = await fetch(`${API_URL}/categories/${cat.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Delete failed')
    }
    categoryRowStates.delete(cat.id)
    await Promise.all([fetchCategories(), fetchRows()])
  } catch (e) {
    state.error = e instanceof Error ? e.message : 'Delete failed'
    state.saving = false
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
  hiddenFromWeb: false,
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
  selectedImageFile: null,
  uploadingImage: false,
  imageError: '',
})

const openEdit = async (row: StockRow) => {
  editModal.itemId = row.itemId
  editModal.open = true
  editLoading.value = true
  editError.value = ''
  imageError.value = ''
  selectedImageFile.value = null
  resetAddVariationForm()
  try {
    const res = await fetch(`${API_URL}/products/${row.itemId}`)
    if (!res.ok) throw new Error('Failed to load product details')
    const { item } = await res.json()
    editForm.name = item.name || ''
    editForm.description = item.description || ''
    editForm.categoryId = item.categories?.[0]?.id || ''
    editForm.hiddenFromWeb = item.hiddenFromWeb ?? false
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
        hiddenFromWeb: editForm.hiddenFromWeb,
        variations: editForm.variations.map(v => ({
          id: v.id,
          name: v.name,
          priceCents: Math.round(v.price * 100),
          trackInventory: v.trackInventory,
          sellable: v.sellable,
          costCents: v.cost.trim() !== '' ? Math.round(parseFloat(v.cost) * 100) : null,
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

// ── Per-variation image upload ────────────────────────────────────────────────
// Each variation gets its own photo (e.g. "Foil Enhanced" needing different
// art than "Regular") instead of every variation sharing the item's one group
// photo — falls back to the group photo automatically when a variation has
// none of its own (see hasOwnImage, resolved server-side).
const variationImageInputs = new Map<string, HTMLInputElement>()
const setVariationImageInput = (id: string, el: Element | ComponentPublicInstance | null) => {
  if (el instanceof HTMLInputElement) variationImageInputs.set(id, el)
  else variationImageInputs.delete(id)
}

const onVariationImageSelected = (variation: VariationForm, event: Event) => {
  const target = event.target as HTMLInputElement
  variation.selectedImageFile = target.files?.[0] || null
}

const uploadVariationImage = async (variation: VariationForm) => {
  if (!variation.selectedImageFile) return
  variation.uploadingImage = true
  variation.imageError = ''
  try {
    const formData = new FormData()
    formData.append('image', variation.selectedImageFile)
    const res = await fetch(
      `${API_URL}/products/${editModal.itemId}/variations/${variation.id}/image`,
      { method: 'POST', body: formData }
    )
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Upload failed')
    }
    const data = await res.json()
    variation.imageUrl = data.imageUrl
    variation.hasOwnImage = true
    variation.selectedImageFile = null
    const inputEl = variationImageInputs.get(variation.id)
    if (inputEl) inputEl.value = ''
  } catch (e) {
    variation.imageError = e instanceof Error ? e.message : 'Upload failed'
  } finally {
    variation.uploadingImage = false
  }
}

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
  if (!addVariationForm.name.trim()) {
    addVariationForm.error = 'Name is required'
    return
  }
  addVariationForm.saving = true
  addVariationForm.error = ''
  try {
    const price = parseFloat(addVariationForm.price)
    const res = await fetch(`${API_URL}/products/${editModal.itemId}/variations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: addVariationForm.name.trim(),
        sku: addVariationForm.sku.trim() || undefined,
        priceCents:
          addVariationForm.price.trim() !== '' && !Number.isNaN(price)
            ? Math.round(price * 100)
            : null,
        trackInventory: addVariationForm.trackInventory,
        sellable: addVariationForm.sellable,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to add variation')
    }
    const { item } = await res.json()
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
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
