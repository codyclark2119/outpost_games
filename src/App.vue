<template>
  <component :is="layoutComponent">
    <router-view />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ADMIN_BASE_PATH } from './config/adminPath'
import PublicLayout from './layouts/PublicLayout.vue'
import AdminLayout from './layouts/AdminLayout.vue'
const route = useRoute()
const layoutComponent = computed(() =>
  route.path.startsWith(ADMIN_BASE_PATH) ? AdminLayout : PublicLayout
)
</script>
