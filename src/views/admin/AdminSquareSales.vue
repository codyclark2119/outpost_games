<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="container mx-auto px-4">
      <div class="max-w-6xl mx-auto">
        <!-- Header -->
        <div class="flex flex-wrap justify-between items-center mb-8 gap-4">
          <div>
            <h1 class="font-cinzel text-4xl font-bold text-gray-800">Square Sales</h1>
            <p class="text-gray-600 mt-1">
              Sales over time pulled from Square POS ({{ report?.environment || '…' }})
            </p>
          </div>
          <router-link to="/x/outpostAdmin" class="btn-secondary px-4 py-2">
            ← Dashboard
          </router-link>
        </div>

        <!-- Range controls -->
        <div class="card-mtg p-4 mb-6 flex flex-wrap items-center gap-3">
          <span class="text-sm font-semibold text-gray-600 uppercase tracking-wide">Range:</span>
          <button
            v-for="preset in presets"
            :key="preset.days"
            class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            :class="
              activeDays === preset.days
                ? 'bg-outpost-gold text-black'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            "
            @click="selectPreset(preset.days)"
          >
            {{ preset.label }}
          </button>
          <span class="text-sm font-semibold text-gray-600 uppercase tracking-wide ml-2"
            >Granularity:</span
          >
          <select v-model="granularity" class="input-field !w-auto py-1.5" @change="fetchReport">
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
          </select>
        </div>

        <!-- Loading -->
        <div v-if="loading && !report" class="text-center py-16">
          <div
            class="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-outpost-gold"
          ></div>
          <p class="mt-4 text-gray-600">Loading sales report…</p>
        </div>

        <!-- Error -->
        <div v-else-if="fetchError" class="card-mtg text-center py-10">
          <p class="text-red-600 mb-4">{{ fetchError }}</p>
          <button class="btn-primary px-6 py-2" @click="fetchReport">Retry</button>
        </div>

        <template v-else-if="report">
          <!-- Summary -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div class="card-mtg text-center py-4">
              <p class="text-2xl font-bold text-gray-800">
                {{ formatMoney(report.totals.revenueCents) }}
              </p>
              <p class="text-xs text-gray-500 uppercase tracking-wide">Total Revenue</p>
            </div>
            <div class="card-mtg text-center py-4">
              <p class="text-2xl font-bold text-gray-800">{{ report.totals.orderCount }}</p>
              <p class="text-xs text-gray-500 uppercase tracking-wide">Orders</p>
            </div>
            <div class="card-mtg text-center py-4">
              <p class="text-2xl font-bold text-gray-800">{{ formatMoney(averageOrderCents) }}</p>
              <p class="text-xs text-gray-500 uppercase tracking-wide">Avg. Order</p>
            </div>
          </div>

          <!-- Empty state -->
          <div v-if="report.series.length === 0" class="card-mtg text-center py-12 mb-6">
            <p class="text-gray-500">No completed orders in this range.</p>
          </div>

          <!-- Chart -->
          <div v-else class="card-mtg p-6 mb-6">
            <Line :data="chartData" :options="chartOptions" />
          </div>

          <!-- Top products -->
          <div class="card-mtg overflow-x-auto p-0">
            <div class="px-4 py-3 border-b border-gray-200">
              <h2 class="font-cinzel font-semibold text-gray-800">Top Products</h2>
            </div>
            <div v-if="report.topItems.length === 0" class="text-center py-8 text-gray-500">
              No product sales in this range.
            </div>
            <table v-else class="w-full text-sm">
              <thead>
                <tr
                  class="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500"
                >
                  <th class="px-4 py-3">Product</th>
                  <th class="px-4 py-3 text-right">Units Sold</th>
                  <th class="px-4 py-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="topItem in report.topItems"
                  :key="topItem.name"
                  class="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                >
                  <td class="px-4 py-2.5 font-medium text-gray-800">{{ topItem.name }}</td>
                  <td class="px-4 py-2.5 text-right text-gray-700">{{ topItem.unitsSold }}</td>
                  <td class="px-4 py-2.5 text-right text-gray-700">
                    {{ formatMoney(topItem.revenueCents) }}
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
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  type ChartOptions,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

interface SalesBucket {
  date: string
  revenueCents: number
  orderCount: number
}

interface TopItem {
  name: string
  unitsSold: number
  revenueCents: number
}

interface SalesReport {
  ok: boolean
  environment: string
  from: string
  to: string
  granularity: 'day' | 'week'
  series: SalesBucket[]
  topItems: TopItem[]
  totals: { revenueCents: number; orderCount: number }
}

const API_URL = `${import.meta.env.VITE_API_URL || '/api'}/square/sales`

const presets = [
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
]

const activeDays = ref(30)
const granularity = ref<'day' | 'week'>('day')
const report = ref<SalesReport | null>(null)
const loading = ref(false)
const fetchError = ref<string | null>(null)

const averageOrderCents = computed(() => {
  if (!report.value || report.value.totals.orderCount === 0) return 0
  return Math.round(report.value.totals.revenueCents / report.value.totals.orderCount)
})

const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`

const chartData = computed(() => ({
  labels: report.value?.series.map(bucket => bucket.date) || [],
  datasets: [
    {
      label: 'Revenue',
      data: report.value?.series.map(bucket => bucket.revenueCents / 100) || [],
      borderColor: '#c9a227',
      backgroundColor: 'rgba(201, 162, 39, 0.15)',
      fill: true,
      tension: 0.3,
      pointRadius: 3,
    },
  ],
}))

const chartOptions: ChartOptions<'line'> = {
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: context => `$${(context.parsed.y ?? 0).toFixed(2)}`,
      },
    },
  },
  scales: {
    y: {
      ticks: { callback: value => `$${value}` },
    },
  },
}

const selectPreset = (days: number) => {
  activeDays.value = days
  fetchReport()
}

const fetchReport = async () => {
  loading.value = true
  fetchError.value = null
  try {
    const to = new Date()
    const from = new Date(Date.now() - activeDays.value * 24 * 60 * 60 * 1000)
    const query = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
      granularity: granularity.value,
    })
    const res = await fetch(`${API_URL}?${query.toString()}`)
    if (!res.ok) throw new Error('Failed to fetch Square sales report')
    report.value = await res.json()
  } catch (e) {
    fetchError.value = e instanceof Error ? e.message : 'Failed to load sales report'
  } finally {
    loading.value = false
  }
}

onMounted(fetchReport)
</script>

<style scoped>
.input-field {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  background: white;
}
</style>
