<template>
  <div class="flex min-h-screen flex-col bg-gray-50">
    <header class="sticky top-0 z-30 bg-outpost-navy text-white shadow-sm">
      <div class="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <router-link
          :to="{ name: 'AdminDashboard' }"
          class="shrink-0 font-display text-base font-bold tracking-wide text-outpost-gold sm:text-lg"
          >Outpost Admin</router-link
        >
        <nav
          v-if="auth.username"
          class="flex min-w-0 items-center gap-1 text-sm whitespace-nowrap"
          aria-label="Admin"
        >
          <!-- Desktop gets the tabs up here; phones get them at the bottom. -->
          <router-link
            v-for="tab in ADMIN_TABS"
            :key="tab.routeName"
            :to="{ name: tab.routeName }"
            class="hidden rounded-md px-3 py-2 font-semibold md:inline-block"
            :class="isActive(tab) ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10'"
            :aria-current="isActive(tab) ? 'page' : undefined"
            >{{ tab.label }}</router-link
          >
          <router-link
            to="/"
            class="hidden rounded-md px-3 py-2 font-semibold text-white/80 hover:bg-white/10 md:inline-block"
            >View site</router-link
          >
          <button
            type="button"
            class="rounded-md px-3 py-2 font-semibold text-white/80 hover:bg-white/10"
            :disabled="loggingOut"
            @click="logout"
          >
            {{ loggingOut ? 'Signing out…' : 'Sign out' }}
          </button>
        </nav>
      </div>
    </header>

    <main class="admin-content flex-1" :class="{ 'with-tab-bar': auth.username }"><slot /></main>

    <!-- Thumb-reach tabs on phones, same idea as the public site's MobileTabBar. -->
    <nav
      v-if="auth.username"
      class="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      aria-label="Admin"
    >
      <ul class="grid grid-cols-4">
        <li v-for="tab in ADMIN_TABS" :key="tab.routeName">
          <router-link
            :to="{ name: tab.routeName }"
            class="relative flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium"
            :class="isActive(tab) ? 'text-outpost-navy' : 'text-gray-500 active:text-outpost-navy'"
            :aria-current="isActive(tab) ? 'page' : undefined"
          >
            <span
              v-if="isActive(tab)"
              class="absolute inset-x-6 top-0 h-0.5 rounded-full bg-outpost-gold"
              aria-hidden="true"
            ></span>
            <component :is="tab.icon" class="h-6 w-6" aria-hidden="true" />
            {{ tab.label }}
          </router-link>
        </li>
      </ul>
    </nav>
    <ConfirmationModal />
  </div>
</template>

<script setup lang="ts">
import ConfirmationModal from '../components/admin/ConfirmationModal.vue'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { ADMIN_TABS, type AdminTab } from '../config/adminNav'
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const loggingOut = ref(false)

const isActive = (tab: AdminTab) => {
  const name = String(route.name ?? '')
  return name === tab.routeName || Boolean(tab.alsoActiveOn?.includes(name))
}

const logout = async () => {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await auth.logout()
    await router.push({ name: 'AdminLogin' })
  } finally {
    loggingOut.value = false
  }
}
</script>

<style>
.admin-content .input-field {
  width: 100%;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
}
.admin-content button,
.admin-content input,
.admin-content select {
  min-height: 2.75rem;
}
.admin-content button,
.admin-content input,
.admin-content select,
.admin-content td {
  font-family: inherit;
}
.admin-content button {
  animation: none;
}
/* Browsers give <fieldset> a min-width of its widest child, so one long
   help line pushed the whole product editor wider than a phone screen. */
.admin-content fieldset,
.catalog-dialog fieldset {
  min-width: 0;
}
/* Room for the fixed tab bar on phones (h-16 plus the iPhone home indicator). */
.admin-content.with-tab-bar {
  padding-bottom: calc(4rem + env(safe-area-inset-bottom));
}
@media (min-width: 768px) {
  .admin-content.with-tab-bar {
    padding-bottom: 0;
  }
}
/* Save/bulk-action bars pinned to the bottom of a screen sit just above the
   tab bar on phones instead of underneath it. */
.admin-action-bar {
  bottom: calc(4rem + env(safe-area-inset-bottom));
}
@media (min-width: 768px) {
  .admin-action-bar {
    bottom: 0;
  }
}
/* iOS Safari zooms the whole page into any field whose text is under 16px and
   never zooms back out, which leaves staff scrolling sideways mid-task. Every
   admin field (dialogs included — they render outside
   .admin-content) is held to 16px on phones; desktop keeps the compact size. */
@media (max-width: 767px) {
  .admin-content input:not([type='checkbox']):not([type='radio']),
  .admin-content select,
  .admin-content textarea,
  .catalog-dialog input:not([type='checkbox']):not([type='radio']),
  .catalog-dialog select,
  .catalog-dialog textarea {
    font-size: 16px !important;
  }
}
</style>
