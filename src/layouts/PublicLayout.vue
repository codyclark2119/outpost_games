<template>
  <!-- The page surface lives here, not on <body>: index.html's critical CSS
       paints body navy (unlayered, so it outranks Tailwind's layers), which
       keeps iOS overscroll matching the navy header and footer. -->
  <div class="flex min-h-screen flex-col bg-outpost-paper">
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-outpost-navy"
    >
      Skip to content
    </a>
    <AppHeader />
    <main id="main" class="flex-1"><slot /></main>
    <AppFooter />
    <MobileTabBar />
  </div>
</template>

<script setup lang="ts">
import AppHeader from '../components/AppHeader.vue'
import AppFooter from '../components/AppFooter.vue'
import MobileTabBar from '../components/MobileTabBar.vue'
</script>
