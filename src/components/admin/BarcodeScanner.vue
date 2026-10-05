<template>
  <div>
    <div class="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-900">
      <video
        ref="videoEl"
        class="h-full w-full object-cover"
        playsinline
        muted
        autoplay
        aria-label="Camera preview"
      ></video>

      <!-- Aim box: the dimmed surround tells you where to hold the barcode -->
      <div
        v-if="status === 'scanning'"
        class="pointer-events-none absolute inset-x-8 top-1/2 h-28 -translate-y-1/2 rounded-xl border-2 shadow-[0_0_0_9999px_rgba(15,36,54,0.45)] transition-colors"
        :class="flash ? 'border-emerald-400' : 'border-outpost-gold'"
        aria-hidden="true"
      ></div>

      <div
        v-if="status !== 'scanning'"
        class="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-white"
      >
        <p v-if="status === 'starting'">Starting camera…</p>
        <p v-else-if="error">{{ error }}</p>
        <button
          v-if="status === 'idle' || status === 'error'"
          type="button"
          class="btn-primary"
          @click="startCamera"
        >
          {{ status === 'error' ? 'Try the camera again' : 'Start camera' }}
        </button>
      </div>
    </div>

    <!-- Typing works too, and so does a Bluetooth/USB scanner (it types the
         code and presses Enter). -->
    <form class="mt-3 flex gap-2" @submit.prevent="submitTyped">
      <label class="min-w-0 flex-1">
        <span class="sr-only">Barcode</span>
        <input
          v-model="typed"
          type="text"
          inputmode="text"
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false"
          placeholder="Or type a barcode / SKU"
          class="input-field"
        />
      </label>
      <button type="submit" class="btn-secondary shrink-0 px-4" :disabled="!typed.trim()">
        Look up
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useBarcodeScanner } from '../../composables/useBarcodeScanner'

const props = withDefaults(defineProps<{ paused?: boolean; autoStart?: boolean }>(), {
  paused: false,
  autoStart: true,
})
const emit = defineEmits<{ detected: [code: string] }>()

const videoEl = ref<HTMLVideoElement | null>(null)
const typed = ref('')
const flash = ref(false)

const {
  status,
  error,
  paused: scannerPaused,
  start,
} = useBarcodeScanner(code => {
  flash.value = true
  window.setTimeout(() => (flash.value = false), 400)
  emit('detected', code)
})

watch(
  () => props.paused,
  value => (scannerPaused.value = value),
  { immediate: true }
)

const startCamera = () => {
  if (videoEl.value) start(videoEl.value)
}

const submitTyped = () => {
  const code = typed.value.trim()
  if (!code) return
  typed.value = ''
  emit('detected', code)
}

onMounted(() => {
  if (props.autoStart) startCamera()
})
</script>
