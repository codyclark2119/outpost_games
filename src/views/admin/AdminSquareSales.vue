<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="container mx-auto px-4">
      <div class="max-w-6xl mx-auto">
        <!-- Header -->
        <div class="flex flex-wrap justify-between items-center mb-8 gap-4">
          <div>
            <h1 class="font-cinzel text-4xl font-bold text-gray-800">Square Sales</h1>
            <p class="text-gray-600 mt-1">
              Sales analytics pulled from Square POS ({{ report?.environment || '…' }})
            </p>
          </div>
          <router-link :to="{ name: 'AdminDashboard' }" class="btn-secondary px-4 py-2">
            ← Dashboard
          </router-link>
        </div>

        <!-- Range controls -->
        <div class="card p-4 mb-6 flex flex-wrap items-center gap-3">
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
            <option value="month">Monthly</option>
          </select>
          <button
            class="ml-auto text-sm text-outpost-navy font-semibold hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="loading"
            @click="fetchReport"
          >
            {{ loading ? 'Refreshing…' : '↻ Refresh' }}
          </button>
        </div>

        <!-- Loading -->
        <div v-if="loading && !report" class="text-center py-16">
          <div
            class="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-outpost-gold"
          ></div>
          <p class="mt-4 text-gray-600">Loading sales report…</p>
        </div>

        <!-- Error -->
        <div v-else-if="fetchError" class="card text-center py-10">
          <p class="text-red-600 mb-4">{{ fetchError }}</p>
          <button class="btn-primary px-6 py-2" @click="fetchReport">Retry</button>
        </div>

        <template v-else-if="report">
          <!-- Summary -->
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <div class="card text-center py-4">
              <p class="text-xl font-bold text-gray-800">
                {{ formatMoney(report.totals.revenueCents) }}
              </p>
              <p class="text-xs text-gray-500 uppercase tracking-wide">Revenue</p>
            </div>
            <div class="card text-center py-4">
              <p class="text-xl font-bold text-gray-800">{{ report.totals.orderCount }}</p>
              <p class="text-xs text-gray-500 uppercase tracking-wide">Orders</p>
            </div>
            <div class="card text-center py-4">
              <p class="text-xl font-bold text-gray-800">{{ formatMoney(averageOrderCents) }}</p>
              <p class="text-xs text-gray-500 uppercase tracking-wide">Avg. Order</p>
            </div>
            <div class="card text-center py-4">
              <p class="text-xl font-bold text-gray-800">
                {{ formatMoney(report.totals.taxCents) }}
              </p>
              <p class="text-xs text-gray-500 uppercase tracking-wide">Tax Collected</p>
            </div>
            <div class="card text-center py-4">
              <p class="text-xl font-bold text-gray-800">
                {{ formatMoney(report.totals.discountCents) }}
              </p>
              <p class="text-xs text-gray-500 uppercase tracking-wide">Discounts Given</p>
            </div>
            <div class="card text-center py-4">
              <p
                class="text-xl font-bold"
                :class="report.totals.profitCents != null ? 'text-green-700' : 'text-gray-300'"
              >
                {{
                  report.totals.profitCents != null ? formatMoney(report.totals.profitCents) : '—'
                }}
              </p>
              <p class="text-xs text-gray-500 uppercase tracking-wide">Profit</p>
            </div>
          </div>

          <!-- Cost data coverage hint -->
          <div
            v-if="
              report.totals.costDataCoverage.itemsWithCost <
              report.totals.costDataCoverage.itemsTotal
            "
            class="card py-3 px-4 mb-6 border border-amber-200 bg-amber-50 flex items-center justify-between gap-4 flex-wrap"
          >
            <p class="text-amber-800 text-sm">
              Profit is only calculated for products with a unit cost entered —
              <strong
                >{{ report.totals.costDataCoverage.itemsWithCost }} of
                {{ report.totals.costDataCoverage.itemsTotal }}</strong
              >
              sold products have one right now. Add costs in the Square Catalog Editor to fill in
              the picture.
            </p>
            <router-link
              :to="{ name: 'AdminSquareCatalog' }"
              class="text-amber-800 font-semibold text-sm hover:underline whitespace-nowrap"
            >
              Open Catalog Editor →
            </router-link>
          </div>

          <!-- Empty state -->
          <div v-if="report.series.length === 0" class="card text-center py-12 mb-6">
            <p class="text-gray-500">No completed orders in this range.</p>
          </div>

          <template v-else>
            <!-- Revenue trend -->
            <div class="card p-6 mb-6">
              <h2 class="font-cinzel font-semibold text-gray-800 mb-4">Revenue Over Time</h2>
              <Line :data="revenueChartData" :options="revenueChartOptions" />
            </div>

            <!-- Orders + AOV trend -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div class="card p-6">
                <h2 class="font-cinzel font-semibold text-gray-800 mb-4">Orders Over Time</h2>
                <Bar :data="ordersChartData" :options="ordersChartOptions" />
              </div>
              <div class="card p-6">
                <h2 class="font-cinzel font-semibold text-gray-800 mb-4">
                  Avg. Order Value Over Time
                </h2>
                <Line :data="aovChartData" :options="aovChartOptions" />
              </div>
            </div>

            <!-- Category + payment method breakdowns -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div class="card p-6">
                <h2 class="font-cinzel font-semibold text-gray-800 mb-4">Revenue by Category</h2>
                <Doughnut :data="categoryRevenueChartData" :options="doughnutOptions" />
              </div>
              <div class="card p-6">
                <h2 class="font-cinzel font-semibold text-gray-800 mb-4">Payment Methods</h2>
                <Doughnut :data="tenderChartData" :options="doughnutOptions" />
              </div>
            </div>

            <!-- Profit by category — only when at least some cost data exists -->
            <div v-if="hasAnyCategoryProfit" class="card p-6 mb-6">
              <h2 class="font-cinzel font-semibold text-gray-800 mb-4">Profit by Category</h2>
              <Bar :data="categoryProfitChartData" :options="horizontalBarOptions" />
            </div>

            <!-- Day of week + hour of day -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div class="card p-6">
                <h2 class="font-cinzel font-semibold text-gray-800 mb-4">Revenue by Day of Week</h2>
                <Bar :data="dayOfWeekChartData" :options="barChartOptions" />
              </div>
              <div class="card p-6">
                <h2 class="font-cinzel font-semibold text-gray-800 mb-4">
                  Revenue by Hour of Day
                  <span class="text-xs text-gray-400 font-normal">(store local time)</span>
                </h2>
                <Bar :data="hourOfDayChartData" :options="barChartOptions" />
              </div>
            </div>
          </template>

          <!-- Top products -->
          <div class="card overflow-hidden p-0">
            <div class="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center gap-3">
              <h2 class="font-cinzel font-semibold text-gray-800 mr-auto">Top Products</h2>
              <input
                v-model="productSearch"
                type="text"
                placeholder="Search products…"
                class="input-field !w-auto max-w-[200px] py-1.5 text-sm"
              />
              <select v-model="categoryFilter" class="input-field !w-auto py-1.5 text-sm">
                <option value="">All Categories</option>
                <option v-for="cat in availableCategories" :key="cat" :value="cat">
                  {{ cat }}
                </option>
              </select>
              <select v-model.number="productLimit" class="input-field !w-auto py-1.5 text-sm">
                <option :value="10">Top 10</option>
                <option :value="25">Top 25</option>
                <option :value="50">Top 50</option>
                <option :value="Infinity">All</option>
              </select>
            </div>
            <div v-if="report.topItems.length === 0" class="text-center py-8 text-gray-500">
              No product sales in this range.
            </div>
            <div v-else class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr
                    class="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500"
                  >
                    <th class="px-4 py-3 cursor-pointer select-none" @click="setSort('name')">
                      Product{{ sortIndicator('name') }}
                    </th>
                    <th
                      class="px-4 py-3 cursor-pointer select-none"
                      @click="setSort('categoryName')"
                    >
                      Category{{ sortIndicator('categoryName') }}
                    </th>
                    <th
                      class="px-4 py-3 text-right cursor-pointer select-none"
                      @click="setSort('unitsSold')"
                    >
                      Units Sold{{ sortIndicator('unitsSold') }}
                    </th>
                    <th
                      class="px-4 py-3 text-right cursor-pointer select-none"
                      @click="setSort('revenueCents')"
                    >
                      Revenue{{ sortIndicator('revenueCents') }}
                    </th>
                    <th
                      class="px-4 py-3 text-right cursor-pointer select-none"
                      @click="setSort('profitCents')"
                    >
                      Profit{{ sortIndicator('profitCents') }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in displayedItems"
                    :key="item.name"
                    class="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                  >
                    <td class="px-4 py-2.5 font-medium text-gray-800">{{ item.name }}</td>
                    <td class="px-4 py-2.5 text-gray-500">{{ item.categoryName }}</td>
                    <td class="px-4 py-2.5 text-right text-gray-700">{{ item.unitsSold }}</td>
                    <td class="px-4 py-2.5 text-right text-gray-700">
                      {{ formatMoney(item.revenueCents) }}
                    </td>
                    <td
                      class="px-4 py-2.5 text-right"
                      :class="item.hasCostData ? 'text-green-700' : 'text-gray-300'"
                    >
                      {{ item.hasCostData ? formatMoney(item.profitCents ?? 0) : '—' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div
              v-if="filteredItems.length > 0"
              class="px-4 py-2.5 border-t border-gray-100 text-xs text-gray-400"
            >
              Showing {{ displayedItems.length }} of {{ filteredItems.length }} matching products
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Line, Bar, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
)

interface SalesBucket {
  date: string
  revenueCents: number
  orderCount: number
}

interface TopItem {
  name: string
  categoryName: string
  unitsSold: number
  revenueCents: number
  costCents: number | null
  hasCostData: boolean
  profitCents: number | null
}

interface TenderTotal {
  type: string
  amountCents: number
  count: number
}

interface DayOfWeekTotal {
  day: string
  revenueCents: number
  orderCount: number
}

interface HourOfDayTotal {
  hour: number
  revenueCents: number
  orderCount: number
}

interface SalesReport {
  ok: boolean
  environment: string
  from: string
  to: string
  granularity: 'day' | 'week' | 'month'
  series: SalesBucket[]
  topItems: TopItem[]
  categoryBreakdown: TopItem[] // same shape as top items but rolled up by categoryName
  tenderTotals: TenderTotal[]
  dayOfWeek: DayOfWeekTotal[]
  hourOfDay: HourOfDayTotal[]
  totals: {
    revenueCents: number
    orderCount: number
    taxCents: number
    discountCents: number
    profitCents: number | null
    costDataCoverage: { itemsWithCost: number; itemsTotal: number }
  }
}

const API_URL = `${import.meta.env.VITE_API_URL || '/api'}/square/sales`

const presets = [
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
  { label: '180 Days', days: 180 },
  { label: '1 Year', days: 365 },
]

const CHART_PALETTE = [
  '#c9a227',
  '#16304a',
  '#2f7d5f',
  '#a3402b',
  '#6b4ce6',
  '#3a6ea5',
  '#d4262c',
  '#8a8f98',
  '#e0a13a',
  '#4c6b52',
]

const activeDays = ref(30)
const granularity = ref<'day' | 'week' | 'month'>('day')
const report = ref<SalesReport | null>(null)
const loading = ref(false)
const fetchError = ref<string | null>(null)

const averageOrderCents = computed(() => {
  if (!report.value || report.value.totals.orderCount === 0) return 0
  return Math.round(report.value.totals.revenueCents / report.value.totals.orderCount)
})

const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`

// ── Revenue trend ──────────────────────────────────────────────────────────────
const revenueChartData = computed(() => ({
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

const revenueChartOptions: ChartOptions<'line'> = {
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: context => `$${(context.parsed.y ?? 0).toFixed(2)}` } },
  },
  scales: { y: { ticks: { callback: value => `$${value}` } } },
}

// ── Orders trend ────────────────────────────────────────────────────────────────
const ordersChartData = computed(() => ({
  labels: report.value?.series.map(bucket => bucket.date) || [],
  datasets: [
    {
      label: 'Orders',
      data: report.value?.series.map(bucket => bucket.orderCount) || [],
      backgroundColor: 'rgba(22, 48, 74, 0.75)',
    },
  ],
}))

const ordersChartOptions: ChartOptions<'bar'> = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
}

// ── Average order value trend ──────────────────────────────────────────────────
const aovChartData = computed(() => ({
  labels: report.value?.series.map(bucket => bucket.date) || [],
  datasets: [
    {
      label: 'Avg. Order Value',
      data:
        report.value?.series.map(bucket =>
          bucket.orderCount > 0 ? bucket.revenueCents / bucket.orderCount / 100 : 0
        ) || [],
      borderColor: '#c9a227',
      backgroundColor: 'rgba(201, 162, 39, 0.15)',
      fill: true,
      tension: 0.3,
      pointRadius: 3,
    },
  ],
}))

const aovChartOptions: ChartOptions<'line'> = {
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: context => `$${(context.parsed.y ?? 0).toFixed(2)}` } },
  },
  scales: { y: { ticks: { callback: value => `$${value}` } } },
}

// ── Category revenue doughnut ──────────────────────────────────────────────────
const categoryRevenueChartData = computed(() => {
  const categories = report.value?.categoryBreakdown || []
  return {
    labels: categories.map(cat => cat.categoryName),
    datasets: [
      {
        data: categories.map(cat => cat.revenueCents / 100),
        backgroundColor: categories.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]),
      },
    ],
  }
})

const doughnutOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  plugins: {
    legend: { position: 'right', labels: { boxWidth: 12 } },
    tooltip: {
      callbacks: { label: context => `${context.label}: $${(context.parsed ?? 0).toFixed(2)}` },
    },
  },
}

// ── Payment methods doughnut ────────────────────────────────────────────────────
const TENDER_LABELS: Record<string, string> = {
  CARD: 'Card',
  CASH: 'Cash',
  WALLET: 'Digital Wallet',
  OTHER: 'Other',
  SQUARE_GIFT_CARD: 'Gift Card',
  BANK_ACCOUNT: 'Bank Transfer',
}

const tenderChartData = computed(() => {
  const tenders = report.value?.tenderTotals || []
  return {
    labels: tenders.map(tender => TENDER_LABELS[tender.type] || tender.type),
    datasets: [
      {
        data: tenders.map(tender => tender.amountCents / 100),
        backgroundColor: tenders.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]),
      },
    ],
  }
})

// ── Profit by category (horizontal bar) — only rendered when data exists ──────
const hasAnyCategoryProfit = computed(() =>
  (report.value?.categoryBreakdown || []).some(cat => cat.hasCostData)
)

const categoryProfitChartData = computed(() => {
  const categories = (report.value?.categoryBreakdown || []).filter(cat => cat.hasCostData)
  return {
    labels: categories.map(cat => cat.categoryName),
    datasets: [
      {
        label: 'Profit',
        data: categories.map(cat => (cat.profitCents ?? 0) / 100),
        backgroundColor: '#2f7d5f',
      },
    ],
  }
})

const horizontalBarOptions: ChartOptions<'bar'> = {
  indexAxis: 'y' as const,
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: context => `$${(context.parsed.x ?? 0).toFixed(2)}` } },
  },
  scales: { x: { ticks: { callback: value => `$${value}` } } },
}

// ── Day of week / hour of day ──────────────────────────────────────────────────
const dayOfWeekChartData = computed(() => {
  const days = report.value?.dayOfWeek || []
  return {
    labels: days.map(d => d.day.slice(0, 3)),
    datasets: [
      {
        label: 'Revenue',
        data: days.map(d => d.revenueCents / 100),
        backgroundColor: '#16304a',
      },
    ],
  }
})

const hourOfDayChartData = computed(() => {
  const hours = report.value?.hourOfDay || []
  return {
    labels: hours.map(h => `${h.hour % 12 === 0 ? 12 : h.hour % 12}${h.hour < 12 ? 'am' : 'pm'}`),
    datasets: [
      {
        label: 'Revenue',
        data: hours.map(h => h.revenueCents / 100),
        backgroundColor: '#c9a227',
      },
    ],
  }
})

const barChartOptions: ChartOptions<'bar'> = {
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: context => `$${(context.parsed.y ?? 0).toFixed(2)}` } },
  },
  scales: { y: { ticks: { callback: value => `$${value}` } } },
}

// ── Top products: filter, search, sort, limit ──────────────────────────────────
const productSearch = ref('')
const categoryFilter = ref('')
const productLimit = ref(10)
type SortKey = 'name' | 'categoryName' | 'unitsSold' | 'revenueCents' | 'profitCents'
const sortKey = ref<SortKey>('unitsSold')
const sortDesc = ref(true)

const availableCategories = computed(() => {
  const names = new Set((report.value?.topItems || []).map(item => item.categoryName))
  return [...names].sort((a, b) => a.localeCompare(b))
})

const setSort = (key: SortKey) => {
  if (sortKey.value === key) {
    sortDesc.value = !sortDesc.value
  } else {
    sortKey.value = key
    sortDesc.value = true
  }
}

const sortIndicator = (key: SortKey) => {
  if (sortKey.value !== key) return ''
  return sortDesc.value ? ' ▼' : ' ▲'
}

const filteredItems = computed(() => {
  const term = productSearch.value.trim().toLowerCase()
  let items = report.value?.topItems || []
  if (categoryFilter.value) {
    items = items.filter(item => item.categoryName === categoryFilter.value)
  }
  if (term) {
    items = items.filter(item => item.name.toLowerCase().includes(term))
  }
  return items
})

const sortedItems = computed(() => {
  const items = [...filteredItems.value]
  const desc = sortDesc.value
  return items.sort((a, b) => {
    if (sortKey.value === 'name' || sortKey.value === 'categoryName') {
      const cmp = a[sortKey.value].localeCompare(b[sortKey.value])
      return desc ? -cmp : cmp
    }
    const aVal = a[sortKey.value] ?? -Infinity
    const bVal = b[sortKey.value] ?? -Infinity
    return desc ? bVal - aVal : aVal - bVal
  })
})

const displayedItems = computed(() => sortedItems.value.slice(0, productLimit.value))

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
