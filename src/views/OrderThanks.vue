<template>
  <!-- Where Square sends a buyer after paying for an online order. -->
  <div class="page-shell max-w-xl py-10 sm:py-16">
    <div class="card text-center">
      <CheckCircleIcon class="mx-auto h-14 w-14 text-emerald-600" aria-hidden="true" />
      <h1 class="mt-3 font-display text-2xl font-bold text-outpost-navy sm:text-3xl">
        Thanks for your order!
      </h1>
      <p class="mt-3 text-slate-600">
        Square will email your receipt. Pick up your order at the shop during open hours, and bring
        the receipt or the name on the order.
      </p>
      <p class="mt-4 rounded-2xl bg-slate-100 p-4 text-sm text-slate-700">
        <span class="font-semibold">{{ STORE_INFO.name }}</span
        ><br />
        {{ STORE_INFO.address.line1 }}<br />
        {{ STORE_INFO.address.city }}, {{ STORE_INFO.address.state }} {{ STORE_INFO.address.zip }}
      </p>
      <div class="mt-6 grid gap-3 sm:flex sm:justify-center">
        <router-link :to="{ path: '/', hash: '#contact' }" class="btn-primary py-3">
          Hours &amp; directions
        </router-link>
        <router-link to="/products" class="btn-secondary py-3">Keep browsing</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckCircleIcon } from '@heroicons/vue/24/outline'
import { STORE_INFO } from '../config/storeInfo'
import { usePageMeta } from '../composables/usePageMeta'

usePageMeta({
  title: 'Thanks for your order — The Outpost Games',
  description: 'Your order is paid. Pick it up at The Outpost Games in Rio Grande City, TX.',
  path: '/order/thanks',
})
</script>
