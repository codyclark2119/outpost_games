<template>
  <AdminPage
    title="Sell online"
    subtitle="Switch a Magic product on to let people buy it on the website and pick it up here. Some always stays in the shop: 1 of each box or bundle, 5 of each booster pack."
    :back="{ to: { name: 'AdminSquareCatalog' }, label: 'Products' }"
  >
    <p v-if="loading && !items.length" class="py-10 text-center text-gray-600" role="status">
      Loading Magic products…
    </p>
    <div v-else-if="loadError && !items.length" class="card py-10 text-center">
      <p class="mb-4 text-red-600">{{ loadError }}</p>
      <button class="btn-primary px-6 py-3" @click="load">Try again</button>
    </div>
    <template v-else>
      <label class="relative mb-4 block">
        <span class="sr-only">Search Magic products</span>
        <MagnifyingGlassIcon
          class="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        />
        <input
          v-model="query"
          type="search"
          placeholder="Search Magic products"
          class="w-full rounded-xl border border-gray-300 bg-white py-3 pr-4 pl-11"
        />
      </label>

      <p class="mb-3 text-sm text-gray-600">
        {{ enabledCount }} of {{ items.length }} selling online
      </p>

      <ul v-if="visibleItems.length" class="space-y-3">
        <li
          v-for="item in visibleItems"
          :key="item.itemId"
          class="rounded-2xl border bg-white p-4 shadow-sm"
          :class="item.enabled ? 'border-emerald-300' : 'border-gray-200'"
        >
          <div class="flex items-center gap-3">
            <img
              v-if="item.imageUrl"
              :src="item.imageUrl"
              alt=""
              class="h-14 w-14 shrink-0 rounded-lg border border-gray-100 object-contain"
              loading="lazy"
            />
            <div class="min-w-0 flex-1">
              <h2 class="font-semibold text-gray-900">{{ item.name }}</h2>
              <p class="text-sm" :class="item.enabled ? 'text-emerald-700' : 'text-gray-500'">
                {{ item.enabled ? 'Selling online' : 'In store only' }}
              </p>
            </div>
            <Switch
              :model-value="item.enabled"
              :disabled="saving.has(item.itemId)"
              class="relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors disabled:opacity-50"
              :class="item.enabled ? 'bg-emerald-600' : 'bg-gray-300'"
              @update:model-value="setEnabled(item, $event)"
            >
              <span class="sr-only">Sell {{ item.name }} online</span>
              <span
                class="inline-block h-6 w-6 rounded-full bg-white shadow transition-transform"
                :class="item.enabled ? 'translate-x-7' : 'translate-x-1'"
              />
            </Switch>
          </div>

          <ul class="mt-3 space-y-1 border-t border-gray-100 pt-3 text-sm">
            <li
              v-for="variation in item.variations"
              :key="variation.id"
              class="flex flex-wrap items-baseline justify-between gap-x-3"
            >
              <span class="min-w-0 text-gray-700">
                {{ variationLabel(item, variation) }} · {{ formatCents(variation.priceCents) }}
              </span>
              <span class="text-gray-600">
                {{ variation.quantity }} here, keeps {{ variation.reserve }} ·
                <span
                  class="font-semibold"
                  :class="variation.onlineQuantity ? 'text-gray-900' : 'text-amber-700'"
                  >{{ variation.onlineQuantity }} online</span
                >
              </span>
            </li>
          </ul>
          <p v-if="errors[item.itemId]" class="mt-2 text-sm text-red-600" role="alert">
            {{ errors[item.itemId] }}
          </p>
        </li>
      </ul>
      <p v-else class="rounded-2xl bg-white p-6 text-center text-gray-600">
        {{ query ? 'No Magic products match that search.' : 'No Magic products with a price.' }}
      </p>
    </template>
  </AdminPage>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Switch } from '@headlessui/vue'
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
import AdminPage from '../../components/admin/AdminPage.vue'
import {
  squareAdminApi,
  type OnlineSaleItem,
  type OnlineSaleVariation,
} from '../../services/squareAdminApi'

const items = ref<OnlineSaleItem[]>([])
const loading = ref(false)
const loadError = ref('')
const query = ref('')
const saving = reactive(new Set<string>())
const errors = reactive<Record<string, string>>({})

const load = async () => {
  loading.value = true
  loadError.value = ''
  try {
    items.value = (await squareAdminApi.getOnlineSales()).items
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Products could not be loaded.'
  } finally {
    loading.value = false
  }
}
onMounted(load)

// What's already for sale stays at the top, so it's easy to check or switch off.
const visibleItems = computed(() => {
  const words = query.value.toLowerCase().split(/\s+/).filter(Boolean)
  return items.value
    .filter(item => words.every(word => item.name.toLowerCase().includes(word)))
    .sort((a, b) => Number(b.enabled) - Number(a.enabled))
})
const enabledCount = computed(() => items.value.filter(item => item.enabled).length)

const setEnabled = async (item: OnlineSaleItem, enabled: boolean) => {
  saving.add(item.itemId)
  delete errors[item.itemId]
  item.enabled = enabled
  try {
    await squareAdminApi.setOnlineSale(item.itemId, enabled)
  } catch (e) {
    item.enabled = !enabled
    errors[item.itemId] = e instanceof Error ? e.message : "That didn't save. Try again."
  } finally {
    saving.delete(item.itemId)
  }
}

// Variation names repeat the product name ("Play Booster - Box"); show just
// the part that tells them apart.
const variationLabel = (item: OnlineSaleItem, variation: OnlineSaleVariation) =>
  item.variations.length > 1 && variation.name.startsWith(`${item.name} - `)
    ? variation.name.slice(item.name.length + 3)
    : item.variations.length > 1
      ? variation.name
      : 'Price'

const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`
</script>
