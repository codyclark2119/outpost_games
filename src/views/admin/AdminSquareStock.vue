<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="container mx-auto px-4">
      <div class="max-w-6xl mx-auto">
        <!-- Header -->
        <div class="flex flex-wrap justify-between items-center mb-8 gap-4">
          <div>
            <h1 class="font-cinzel text-4xl font-bold text-gray-800">Square Stock Report</h1>
            <p class="text-gray-600 mt-1">
              Live inventory pulled from Square POS ({{ report?.environment || '…' }})
            </p>
          </div>
          <div class="flex gap-3">
            <button
              class="btn-primary px-4 py-2"
              :disabled="loading || items.length === 0"
              @click="exportCsv"
            >
              Export CSV
            </button>
            <router-link to="/x/outpostAdmin" class="btn-secondary px-4 py-2">
              ← Dashboard
            </router-link>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading && items.length === 0" class="text-center py-16">
          <div
            class="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-outpost-gold"
          ></div>
          <p class="mt-4 text-gray-600">Loading stock report…</p>
        </div>

        <!-- Error -->
        <div v-else-if="fetchError" class="card-mtg text-center py-10">
          <p class="text-red-600 mb-4">{{ fetchError }}</p>
          <button class="btn-primary px-6 py-2" @click="fetchReport">Retry</button>
        </div>

        <template v-else>
          <!-- Summary -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div class="card-mtg text-center py-4">
              <p class="text-2xl font-bold text-gray-800">{{ items.length }}</p>
              <p class="text-xs text-gray-500 uppercase tracking-wide">Total Items</p>
            </div>
            <div class="card-mtg text-center py-4">
              <p class="text-2xl font-bold text-green-600">{{ inStockCount }}</p>
              <p class="text-xs text-gray-500 uppercase tracking-wide">In Stock</p>
            </div>
            <div class="card-mtg text-center py-4">
              <p class="text-2xl font-bold text-red-600">{{ outOfStockCount }}</p>
              <p class="text-xs text-gray-500 uppercase tracking-wide">Out of Stock</p>
            </div>
            <div class="card-mtg text-center py-4">
              <p class="text-2xl font-bold text-gray-400">{{ notTrackedCount }}</p>
              <p class="text-xs text-gray-500 uppercase tracking-wide">Not Tracked</p>
            </div>
          </div>

          <!-- Empty state -->
          <div v-if="items.length === 0" class="card-mtg text-center py-12">
            <p class="text-gray-500">No items returned from Square.</p>
          </div>

          <!-- Table -->
          <div v-else class="card-mtg overflow-x-auto p-0">
            <table class="w-full text-sm">
              <thead>
                <tr
                  class="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500"
                >
                  <th class="px-4 py-3">Item</th>
                  <th class="px-4 py-3">SKU</th>
                  <th class="px-4 py-3 text-right">Price</th>
                  <th class="px-4 py-3 text-right">Quantity</th>
                  <th class="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in items"
                  :key="item.id"
                  class="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                >
                  <td class="px-4 py-2.5 font-medium text-gray-800">{{ item.displayName }}</td>
                  <td class="px-4 py-2.5 text-gray-500">{{ item.sku || '—' }}</td>
                  <td class="px-4 py-2.5 text-right text-gray-700">{{ formatPrice(item) }}</td>
                  <td class="px-4 py-2.5 text-right text-gray-700">{{ item.quantity ?? '—' }}</td>
                  <td class="px-4 py-2.5">
                    <span
                      class="text-xs px-2 py-0.5 rounded-full font-semibold"
                      :class="statusClass(item)"
                    >
                      {{ statusLabel(item) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface SquareStockItem {
  id: string
  itemId: string
  displayName: string
  sku: string | null
  priceCents: number | null
  currency: string | null
  trackInventory: boolean
  quantity: number | null
  state: string
  inStock: boolean
  source: string
}

interface SquareInventoryReport {
  ok: boolean
  environment: string
  locationId: string | null
  itemCount: number
  items: SquareStockItem[]
}

const API_URL = `${import.meta.env.VITE_API_URL || '/api'}/square/inventory-report`

const report = ref<SquareInventoryReport | null>(null)
const loading = ref(false)
const fetchError = ref<string | null>(null)

const items = computed(() => report.value?.items || [])
const inStockCount = computed(
  () => items.value.filter(item => item.trackInventory && item.inStock).length
)
const outOfStockCount = computed(
  () => items.value.filter(item => item.trackInventory && !item.inStock).length
)
const notTrackedCount = computed(() => items.value.filter(item => !item.trackInventory).length)

const statusLabel = (item: SquareStockItem) => {
  if (!item.trackInventory) return 'Not Tracked'
  return item.inStock ? 'In Stock' : 'Out of Stock'
}

const statusClass = (item: SquareStockItem) => {
  if (!item.trackInventory) return 'bg-gray-100 text-gray-500'
  return item.inStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
}

const formatPrice = (item: SquareStockItem) => {
  if (item.priceCents == null) return '—'
  return `$${(item.priceCents / 100).toFixed(2)}`
}

const fetchReport = async () => {
  loading.value = true
  fetchError.value = null
  try {
    const res = await fetch(API_URL)
    if (!res.ok) throw new Error('Failed to fetch Square stock report')
    report.value = await res.json()
  } catch (e) {
    fetchError.value = e instanceof Error ? e.message : 'Failed to load stock report'
  } finally {
    loading.value = false
  }
}

const csvEscape = (value: string) => {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

const exportCsv = () => {
  const header = ['Item', 'SKU', 'Price', 'Quantity', 'Status']
  const rows = items.value.map(item => [
    csvEscape(item.displayName),
    csvEscape(item.sku || ''),
    item.priceCents != null ? (item.priceCents / 100).toFixed(2) : '',
    item.quantity ?? '',
    statusLabel(item),
  ])
  const csv = [header, ...rows].map(row => row.join(',')).join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
  link.href = url
  link.download = `square-stock-report-${date}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

onMounted(fetchReport)
</script>
