<template>
  <div class="flex flex-wrap items-center gap-2">
    <a
      :href="STORE_INFO.social.linktree"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors"
      :class="
        dark
          ? 'bg-outpost-gold text-outpost-black hover:bg-outpost-gold-light'
          : 'bg-outpost-navy text-white hover:bg-outpost-navy-light'
      "
    >
      <SocialIcon name="linktree" class="h-4 w-4" />
      All our links
    </a>
    <a
      v-for="link in iconLinks"
      :key="link.name"
      :href="link.href"
      target="_blank"
      rel="noopener noreferrer"
      :aria-label="link.label"
      :title="link.label"
      class="inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors"
      :class="
        dark
          ? 'border-white/15 text-white/80 hover:border-white/40 hover:text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:border-outpost-navy hover:text-outpost-navy'
      "
    >
      <SocialIcon :name="link.name" class="h-5 w-5" />
    </a>
  </div>
</template>

<script setup lang="ts">
import SocialIcon, { type SocialIconName } from './SocialIcon.vue'
import { STORE_INFO } from '../config/storeInfo'

// Linktree leads (it's the hub that also carries TikTok); the direct icons
// cover the accounts people most often jump straight to.
defineProps<{ dark?: boolean }>()

const iconLinks: { name: SocialIconName; href: string; label: string }[] = [
  { name: 'instagram', href: STORE_INFO.social.instagram, label: 'Instagram' },
  { name: 'discord', href: STORE_INFO.social.discord, label: 'Discord' },
  { name: 'facebook', href: STORE_INFO.social.facebook, label: 'Facebook' },
]
</script>
