<template>
  <div class="min-h-screen bg-gray-50 py-6 pb-24 sm:py-10">
    <div class="mx-auto max-w-xl px-4">
      <div class="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 class="font-display text-3xl font-bold text-gray-800">Scan</h1>
          <p class="mt-1 text-sm text-gray-600">
            Look up, count, or link a barcode ({{ report?.environment || '…' }})
          </p>
        </div>
        <router-link :to="{ name: 'AdminDashboard' }" class="btn-secondary shrink-0 px-3 py-2">
          ← Dashboard
        </router-link>
      </div>

      <div v-if="loadError" class="card mb-4 border border-red-200 bg-red-50 p-4">
        <p class="text-sm text-red-700">{{ loadError }}</p>
        <button type="button" class="btn-secondary mt-3 px-4 py-2" @click="loadReport">
          Retry
        </button>
      </div>

      <BarcodeScanner :paused="Boolean(scanned)" @detected="onDetected" />

      <section v-if="scanned" class="card mt-4 p-4" aria-live="polite">
        <p class="text-xs font-semibold tracking-wide text-gray-500 uppercase">Scanned</p>
        <p class="font-mono text-lg break-all text-gray-900">{{ scanned }}</p>

        <p v-if="!report" class="mt-4 text-sm text-gray-600">Loading the catalog…</p>

        <!-- Known barcode -->
        <template v-else-if="matches.length">
          <p
            v-if="matches.length > 1"
            class="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"
          >
            This barcode is on {{ matches.length }} products in Square — fix the duplicates there so
            the register finds the right one.
          </p>
          <div
            v-for="item in matches"
            :key="item.id"
            class="mt-4 flex gap-3 border-t border-gray-100 pt-4 first:border-0"
          >
            <div
              class="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100"
            >
              <img
                v-if="item.imageUrl"
                :src="item.imageUrl"
                :alt="item.displayName"
                class="h-full w-full object-contain"
              />
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-semibold text-gray-900">{{ item.displayName }}</p>
              <p class="text-sm text-gray-500">{{ item.categoryName }} · {{ price(item) }}</p>
              <p class="mt-1 text-xs text-gray-500">
                SKU {{ item.sku || '—' }} · GTIN {{ item.upc || '—' }}
              </p>
              <p class="mt-1 text-sm">
                On hand:
                <span class="font-semibold">{{
                  item.trackInventory ? (item.quantity ?? 0) : 'not tracked'
                }}</span>
              </p>
            </div>
          </div>

          <!-- Set count (single, tracked match) -->
          <form
            v-if="matches.length === 1 && matches[0]!.trackInventory"
            class="mt-4 flex items-end gap-2"
            @submit.prevent="saveCount(matches[0]!)"
          >
            <label class="flex-1">
              <span class="mb-1 block text-xs font-semibold text-gray-600">Set on-hand count</span>
              <input
                v-model="countInput"
                type="number"
                min="0"
                step="1"
                inputmode="numeric"
                class="input-field"
              />
            </label>
            <button
              type="submit"
              class="btn-primary shrink-0 px-5"
              :disabled="saving || countInput === ''"
            >
              {{ saving ? 'Saving…' : 'Save' }}
            </button>
          </form>
        </template>

        <!-- Unknown barcode: link it to a product -->
        <template v-else>
          <p class="mt-3 text-sm text-gray-700">
            No product has this barcode yet. Find the product to link it to:
          </p>
          <input
            v-model="search"
            type="search"
            placeholder="Search by name or SKU"
            class="input-field mt-2"
            autocomplete="off"
          />
          <ul v-if="search.trim()" class="mt-2 divide-y divide-gray-100">
            <li v-for="item in searchResults" :key="item.id">
              <button
                type="button"
                class="w-full py-2.5 text-left"
                :class="selected?.id === item.id ? 'font-semibold text-outpost-navy' : ''"
                @click="selected = item"
              >
                <span class="block text-sm">{{ item.displayName }}</span>
                <span class="block text-xs text-gray-500">
                  {{ item.categoryName }} · SKU {{ item.sku || '—' }}
                </span>
              </button>
            </li>
            <li v-if="!searchResults.length" class="py-2.5 text-sm text-gray-500">No matches.</li>
          </ul>

          <div v-if="selected" class="mt-3 rounded-xl bg-gray-50 p-3 text-sm">
            <p class="font-semibold text-gray-900">{{ selected.displayName }}</p>
            <p v-if="linkPlan.blocked" class="mt-1 text-amber-800">{{ linkPlan.blocked }}</p>
            <p v-else class="mt-1 text-gray-600">
              {{
                linkPlan.field === 'sku'
                  ? 'Will be saved as its SKU — the register will find it by this barcode.'
                  : `Will be added as its GTIN, keeping SKU ${selected.sku}.`
              }}
            </p>
            <button
              type="button"
              class="btn-primary mt-3 w-full"
              :disabled="Boolean(linkPlan.blocked) || saving"
              @click="link(selected)"
            >
              {{ saving ? 'Linking…' : 'Link barcode' }}
            </button>
          </div>
        </template>

        <p v-if="message" class="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
          {{ message }}
        </p>
        <p v-if="actionError" class="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {{ actionError }}
        </p>

        <button type="button" class="btn-secondary mt-4 w-full py-3" @click="reset">
          Scan next
        </button>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import BarcodeScanner from '../../components/admin/BarcodeScanner.vue'
import { squareAdminApi } from '../../services/squareAdminApi'
import type { SquareInventoryReport, SquareStockItem } from '../../services/squareAdminTypes'
import { findByBarcode } from '../../utils/barcode'

const report = ref<SquareInventoryReport | null>(null)
const loadError = ref<string | null>(null)

const scanned = ref<string | null>(null)
const countInput = ref('')
const search = ref('')
const selected = ref<SquareStockItem | null>(null)
const saving = ref(false)
const message = ref<string | null>(null)
const actionError = ref<string | null>(null)

const loadReport = async () => {
  loadError.value = null
  try {
    report.value = await squareAdminApi.getCatalog()
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load the catalog'
  }
}

const matches = computed(() =>
  scanned.value && report.value ? findByBarcode(report.value.items, scanned.value) : []
)

const price = (item: SquareStockItem) =>
  item.priceCents ? `$${(item.priceCents / 100).toFixed(2)}` : 'no price'

const onDetected = (code: string) => {
  scanned.value = code
  message.value = null
  actionError.value = null
  search.value = ''
  selected.value = null
}

// Prefill the count with what Square has now. Watched rather than set in
// onDetected because a scan can land before the catalog has loaded; a negative
// on-hand (sales against an uncounted shelf) starts blank instead.
watch(
  () => (matches.value.length === 1 ? matches.value[0] : null),
  item => {
    const quantity = item?.trackInventory ? (item.quantity ?? 0) : null
    countInput.value = quantity !== null && quantity >= 0 ? String(quantity) : ''
  }
)

const reset = () => {
  scanned.value = null
  message.value = null
  actionError.value = null
}

const searchResults = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term || !report.value) return []
  return report.value.items
    .filter(
      item =>
        item.displayName.toLowerCase().includes(term) ||
        (item.sku || '').toLowerCase().includes(term)
    )
    .slice(0, 8)
})

// Mirrors linkSquareVariationBarcode's rules so the admin knows what will
// happen before tapping — the API enforces them regardless.
const linkPlan = computed((): { field?: 'sku' | 'upc'; blocked?: string } => {
  const item = selected.value
  const code = scanned.value?.trim() ?? ''
  if (!item) return {}
  if (!item.sku) return { field: 'sku' }
  if (!/^\d{12,14}$/.test(code)) {
    return {
      blocked: `It already has SKU ${item.sku}. SKUs are locked to protect register scanning, and only a 12–14 digit manufacturer barcode can be added (as its GTIN).`,
    }
  }
  if (item.upc) return { blocked: `It already has SKU ${item.sku} and GTIN ${item.upc}.` }
  return { field: 'upc' }
})

const link = async (item: SquareStockItem) => {
  if (!scanned.value || saving.value) return
  saving.value = true
  actionError.value = null
  try {
    const result = await squareAdminApi.linkBarcode(item.id, scanned.value)
    await loadReport()
    message.value = `Linked to ${item.displayName} as its ${result.field === 'sku' ? 'SKU' : 'GTIN'}.`
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Linking failed'
  } finally {
    saving.value = false
  }
}

const saveCount = async (item: SquareStockItem) => {
  if (saving.value) return
  saving.value = true
  actionError.value = null
  try {
    const quantity = Number(countInput.value)
    await squareAdminApi.updateInventory(item.itemId, { variationId: item.id, quantity })
    await loadReport()
    message.value = `On-hand count for ${item.displayName} set to ${quantity}.`
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Saving the count failed'
  } finally {
    saving.value = false
  }
}

onMounted(loadReport)
</script>
