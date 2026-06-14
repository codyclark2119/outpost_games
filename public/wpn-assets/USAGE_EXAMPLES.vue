<!-- Example: How to use WPN assets in Vue components -->

<template>
  <div>
    <!-- Set Symbol Example -->
    <section class="set-symbol">
      <img 
        src="/wpn-assets/avatar-last-airbender/product-images/set-symbols/TLAMythic_3in.png" 
        alt="Avatar: The Last Airbender Set Symbol"
        class="w-16 h-16"
      />
    </section>

    <!-- Product Family Shot Example -->
    <!-- Product Family Shot Example -->
    <section class="products">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="product-card">
          <img 
            src="/wpn-assets/tmnt/product-images/family-shots/TMT_familyshot_1920x1080_1_en.jpg" 
            alt="TMNT Product Family"
            class="w-full"
          />
          <h3>TMNT Product Line</h3>
        </div>
        <div class="product-card">
          <img 
            src="/wpn-assets/edge-eternities/product-images/family-shots/EOE_familyshot_1920x1080_1_en.jpg" 
            alt="Edge of Eternities Product Family"
            class="w-full"
          />
          <h3>Edge of Eternities</h3>
        </div>
      </div>
    </section>

    <!-- Social Media Key Art Example -->
    <section class="key-art">
      <img 
        src="/wpn-assets/final-fantasy/social-media/key-art/FIN_sma_key_1920x1080_en.jpg" 
        alt="Final Fantasy Key Art"
        class="rounded-lg shadow-lg w-full"
      />
    </section>

    <!-- Social Media Preview Example -->
    <div class="social-share">
      <!-- Open Graph meta tags for social sharing -->
      <!-- Add these to your page's <head> section -->
      <!--
      <meta property="og:image" content="https://yoursite.com/wpn-assets/avatar-last-airbender/social-media/key-art/TLA_sma_key_1920x1080_EN.jpg">
      <meta property="og:image:width" content="1920">
      <meta property="og:image:height" content="1080">
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:image" content="https://yoursite.com/wpn-assets/spiderman/social-media/key-art/SPM_sma_key_1920x1080_en.jpg">
      -->
    </div>

    <!-- Dynamic Set Banner (using reactive data) -->
    <section class="current-set">
      <img 
        :src="`/wpn-assets/${currentSet}/banners/${currentSet}-banner.jpg`" 
        :alt="`${currentSetName} Banner`"
        class="w-full"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// Example: Dynamic set switching
const currentSet = ref('lorwyn-eclipsed')
const currentSetName = ref('Teenage Mutant Ninja Turtles')

// Example: Set configuration
const availableSets = [
  {
    slug: 'tmnt',
    name: 'Teenage Mutant Ninja Turtles',
    status: 'current',
    bannerPath: '/wpn-assets/tmnt/banners/TMT_oversized_art_34x80_en.jpg'
  },
  {
    slug: 'avatar-last-airbender',
    name: 'Avatar: The Last Airbender',
    status: 'current',
    bannerPath: '/wpn-assets/avatar-last-airbender/product-images/family-shots/TLA_familyshot_1920x1080_1.jpg'
  },
  {
    slug: 'final-fantasy',
    name: 'Final Fantasy',
    status: 'current',
    bannerPath: '/wpn-assets/final-fantasy/social-media/key-art/FIN_sma_key_1920x1080_en.jpg'
  }
]
</script>

<style scoped>
/* Ensure images are responsive and maintain aspect ratio */
img {
  max-width: 100%;
  height: auto;
}

.product-card {
  @apply bg-white rounded-lg shadow-md p-4;
}
</style>

<!-- 
Usage Notes:
1. All paths start with "/wpn-assets/" - no need for import statements
2. Files in public/ folder are served directly from root
3. Use descriptive alt text for accessibility
4. Optimize images before adding them to wpn-assets folders
5. Assets are now organized in standardized subfolders

Organized Folder Structure Examples:
- /wpn-assets/tmnt/product-images/set-symbols/MTGTMT_expsym_M.png
- /wpn-assets/avatar-last-airbender/product-images/family-shots/TLA_familyshot_1920x1080_1.jpg
- /wpn-assets/final-fantasy/social-media/key-art/FIN_sma_key_1920x1080_en.jpg
- /wpn-assets/general/logos/mtg/MTG_Primary_LL_1c_White_LG_V12.png
- /wpn-assets/general/event-templates/fnm/MTG_FMN_1C_White_LG_v5.png
-->
