import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    // Enable better caching through chunking
    rollupOptions: {
      output: {
        // Separate chunks for better caching and lazy loading
        manualChunks(id) {
          // Core vendor libraries
          if (id.includes('node_modules')) {
            if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router')) {
              return 'vendor-vue'
            }
            if (id.includes('@headlessui') || id.includes('@heroicons')) {
              return 'vendor-ui'
            }
            // Other node_modules go into vendor-libs
            return 'vendor-libs'
          }
          // Admin components in separate chunk (lazy loaded)
          if (id.includes('/views/admin/')) {
            return 'admin'
          }
        },
        // Asset file naming with content hash for cache busting
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.')
          const ext = info?.[info.length - 1]
          
          // Fonts
          if (/woff|woff2|ttf|eot|otf/.test(ext || '')) {
            return 'assets/fonts/[name]-[hash][extname]'
          }
          // Images
          if (/png|jpe?g|svg|gif|webp|avif/.test(ext || '')) {
            return 'assets/images/[name]-[hash][extname]'
          }
          // CSS
          if (ext === 'css') {
            return 'assets/css/[name]-[hash][extname]'
          }
          // Default
          return 'assets/[name]-[hash][extname]'
        },
        // JS chunk naming with content hash
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      }
    },
    // Asset inline threshold - files smaller than this are inlined
    assetsInlineLimit: 4096, // 4kb
    // CSS code splitting for better caching
    cssCodeSplit: true,
    // Generate sourcemaps for debugging (remove in production if needed)
    sourcemap: false,
    // Minification
    minify: 'esbuild',
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // Report compressed size
    reportCompressedSize: true,
    // Chunk size warning limit
    chunkSizeWarningLimit: 600,
  },
  // Optimization hints
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia'],
    // Exclude large dependencies that don't need pre-bundling
    exclude: []
  },
  // Server settings for development
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
