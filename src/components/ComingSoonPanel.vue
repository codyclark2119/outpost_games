<template>
  <div class="card text-center py-12">
    <div
      class="w-20 h-20 bg-outpost-navy rounded-full flex items-center justify-center mx-auto mb-6"
    >
      <svg
        class="w-10 h-10 text-outpost-gold"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    </div>
    <h2 class="font-cinzel text-2xl font-bold mb-4 text-gray-800">{{ title }}</h2>
    <p class="text-gray-600 text-lg mb-6 max-w-xl mx-auto">{{ message }}</p>
    <div class="bg-gray-100 rounded-lg p-6 max-w-md mx-auto">
      <h3 class="font-semibold mb-2">Visit Our Store:</h3>
      <p class="text-sm text-gray-600">
        605 W. Main Street, Suite 4<br />
        Rio Grande City, TX 78582<br /><br />
        <strong>Hours:</strong> Thursday–Sunday, 5:00 PM – 10:00 PM
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    message?: string
  }>(),
  {
    title: 'Our Online Catalog is Getting a Refresh',
    message:
      "We're updating how products are listed here, so this page is paused for now. Everything is still fully stocked in store — come see the full selection in person!",
  }
)
</script>
