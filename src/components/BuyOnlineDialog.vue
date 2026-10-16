<template>
  <!-- Picks a quantity, then hands the shopper to Square's own checkout page.
       A bottom sheet on phones, a centered card on larger screens. -->
  <Dialog :open="open" class="relative z-[60]" @close="close">
    <div class="fixed inset-0 bg-black/50" aria-hidden="true" />
    <div class="fixed inset-0 flex items-end justify-center sm:items-center sm:p-4">
      <DialogPanel
        class="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl sm:p-6"
      >
        <div class="flex items-start gap-4">
          <img
            v-if="item.imageUrl"
            :src="productImageSrc(item.imageUrl)"
            @error="fallBackToOriginal($event, item.imageUrl)"
            alt=""
            class="h-20 w-20 shrink-0 rounded-xl border border-slate-200 object-contain p-1"
          />
          <div class="min-w-0 flex-1">
            <DialogTitle class="font-semibold text-slate-900">{{ item.name }}</DialogTitle>
            <p class="mt-1 text-lg font-semibold text-outpost-navy">{{ formatPrice(item) }}</p>
          </div>
          <button
            type="button"
            class="-mt-1 -mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
            aria-label="Close"
            @click="close"
          >
            <XMarkIcon class="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div class="mt-5 flex items-center justify-between gap-4">
          <span id="buy-quantity-label" class="font-medium text-slate-800">Quantity</span>
          <div class="flex items-center" role="group" aria-labelledby="buy-quantity-label">
            <button
              type="button"
              class="flex h-11 w-11 items-center justify-center rounded-l-xl border border-slate-300 text-slate-700 disabled:opacity-40"
              :disabled="quantity <= 1 || busy"
              aria-label="One fewer"
              @click="quantity--"
            >
              <MinusIcon class="h-5 w-5" aria-hidden="true" />
            </button>
            <output
              class="flex h-11 w-12 items-center justify-center border-y border-slate-300 font-semibold"
              aria-live="polite"
              >{{ quantity }}</output
            >
            <button
              type="button"
              class="flex h-11 w-11 items-center justify-center rounded-r-xl border border-slate-300 text-slate-700 disabled:opacity-40"
              :disabled="quantity >= max || busy"
              aria-label="One more"
              @click="quantity++"
            >
              <PlusIcon class="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
        <p class="mt-2 text-right text-sm text-slate-500">{{ max }} available online</p>

        <p class="mt-4 rounded-2xl bg-slate-100 p-4 text-sm text-slate-700">
          You'll pay on Square's secure checkout, then pick up your order at the shop during open
          hours.
        </p>

        <p v-if="error" class="mt-4 text-sm font-medium text-red-700" role="alert">{{ error }}</p>

        <button
          type="button"
          class="btn-primary mt-5 w-full py-3"
          :disabled="busy || max < 1"
          @click="checkout"
        >
          <LockClosedIcon class="h-5 w-5" aria-hidden="true" />
          {{ busy ? 'Opening checkout…' : `Checkout · ${total}` }}
        </button>
      </DialogPanel>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue'
import { LockClosedIcon, MinusIcon, PlusIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { formatPrice, type SquarePublicItem } from '../stores/squareCatalog'
import { productImageSrc, fallBackToOriginal } from '../utils/productImage'
import { apiFetch, ApiError } from '../services/api'

const props = defineProps<{ item: SquarePublicItem; open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const quantity = ref(1)
const busy = ref(false)
const error = ref('')
// Starts at what the catalog said; lowered if the shop sold some in the
// meantime and the API says so.
const max = ref(props.item.onlineQuantity ?? 0)

watch(
  () => props.open,
  open => {
    if (!open) return
    quantity.value = 1
    error.value = ''
    max.value = props.item.onlineQuantity ?? 0
  }
)

const total = computed(
  () => `$${(((props.item.priceCents ?? 0) * quantity.value) / 100).toFixed(2)}`
)

const close = () => {
  if (!busy.value) emit('close')
}

const checkout = async () => {
  busy.value = true
  error.value = ''
  try {
    const { url } = await apiFetch<{ url: string }>('/checkout', {
      method: 'POST',
      body: JSON.stringify({
        itemId: props.item.itemId,
        variationId: props.item.id,
        quantity: quantity.value,
      }),
    })
    window.location.assign(url)
  } catch (e) {
    busy.value = false
    if (e instanceof ApiError && e.status === 409) {
      const available = (e.payload as { available?: number } | null)?.available ?? 0
      max.value = available
      quantity.value = Math.max(1, Math.min(quantity.value, available))
    }
    error.value =
      e instanceof ApiError && e.status !== 0 && e.status < 500
        ? e.message
        : "Checkout couldn't open just now. Please try again, or call the shop."
  }
}
</script>
