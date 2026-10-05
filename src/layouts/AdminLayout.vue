<template>
  <div class="min-h-screen bg-gray-50">
    <header class="border-b border-gray-200 bg-outpost-navy text-white shadow-sm">
      <div class="container mx-auto flex min-h-14 items-center justify-between gap-3 px-4 py-2">
        <router-link
          :to="ADMIN_BASE_PATH"
          class="shrink-0 font-display text-base font-bold tracking-wide text-outpost-gold sm:text-lg"
          >Outpost Admin</router-link
        >
        <nav
          v-if="auth.username"
          class="flex items-center justify-end gap-1 text-sm whitespace-nowrap"
        >
          <router-link
            :to="ADMIN_BASE_PATH"
            class="rounded-md px-2.5 py-2 font-semibold hover:bg-white/10"
            >Dashboard</router-link
          >
          <router-link
            :to="{ name: 'AdminSquareScan' }"
            class="rounded-md bg-white/10 px-2.5 py-2 font-semibold hover:bg-white/20"
            >Scan</router-link
          >
          <router-link
            to="/"
            class="hidden rounded-md px-2.5 py-2 font-semibold hover:bg-white/10 sm:inline-block"
            >View Store</router-link
          >
          <span class="hidden px-2 text-gray-300 md:inline">{{ auth.username }}</span>
          <button
            type="button"
            class="rounded-md border border-red-300/40 px-2.5 py-2 font-semibold text-red-100 hover:bg-red-500/20"
            :disabled="loggingOut"
            @click="logout"
          >
            {{ loggingOut ? '…' : 'Log Out' }}
          </button>
        </nav>
      </div>
    </header>
    <main class="admin-content"><slot /></main>
    <ConfirmationModal />
  </div>
</template>

<script setup lang="ts">
import ConfirmationModal from '../components/admin/ConfirmationModal.vue'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ADMIN_BASE_PATH } from '../config/adminPath'
import { useAuthStore } from '../stores/auth'
const auth = useAuthStore()
const router = useRouter()
const loggingOut = ref(false)
const logout = async () => {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await auth.logout()
    await router.push(`${ADMIN_BASE_PATH}/login`)
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
</style>
