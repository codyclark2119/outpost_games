<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
    <div class="w-full max-w-sm">
      <h1 class="font-cinzel text-3xl font-bold text-center mb-8 text-gray-800">Admin Login</h1>

      <form class="card-mtg space-y-5" @submit.prevent="handleSubmit">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <input
            v-model="username"
            type="text"
            required
            autocomplete="username"
            class="input-field"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            class="input-field"
          />
        </div>

        <div v-if="error" class="text-red-600 text-sm">{{ error }}</div>

        <button type="submit" class="btn-primary w-full py-2.5" :disabled="loading">
          {{ loading ? 'Signing in…' : 'Sign In' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const handleSubmit = async () => {
  loading.value = true
  error.value = ''
  try {
    await auth.login(username.value, password.value)
    const redirect =
      typeof route.query.redirect === 'string' ? route.query.redirect : '/x/outpostAdmin'
    router.push(redirect)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.input-field {
  width: 100%;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  transition:
    box-shadow 0.15s,
    border-color 0.15s;
}
.input-field:focus {
  outline: none;
  border-color: transparent;
  box-shadow: 0 0 0 2px #16304a;
}
</style>
