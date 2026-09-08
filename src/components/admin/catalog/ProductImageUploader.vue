<template>
  <div class="flex items-center gap-3">
    <img
      v-if="imageUrl"
      :src="imageUrl"
      alt="Product image"
      class="h-16 w-16 rounded-lg border object-cover"
    />
    <span v-else class="text-sm text-gray-500">No image</span>
    <div>
      <label class="block text-sm text-gray-700"
        >{{ label }}
        <input
          ref="input"
          type="file"
          accept="image/jpeg,image/png,image/gif"
          :disabled="busy"
          @change="selectFile"
        />
      </label>
      <button
        type="button"
        class="btn-secondary px-3 py-2 text-sm"
        :disabled="busy || !file"
        @click="upload"
      >
        {{ busy ? 'Uploading…' : 'Upload' }}
      </button>
      <p v-if="error" role="alert" class="text-sm text-red-700">{{ error }}</p>
      <p v-if="success" role="status" class="text-sm text-green-700">Image uploaded.</p>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { squareAdminApi } from '../../../services/squareAdminApi'
const props = defineProps<{ itemId: string; variationId?: string; label: string }>()
const imageUrl = defineModel<string | null>({ required: true })
const emit = defineEmits<{ busy: [value: boolean]; uploaded: [] }>()
const input = ref<HTMLInputElement | null>(null)
const file = ref<File | null>(null)
const busy = ref(false)
const error = ref('')
const success = ref(false)
const selectFile = (event: Event) => {
  file.value = (event.target as HTMLInputElement).files?.[0] ?? null
  success.value = false
}
const upload = async () => {
  if (busy.value || !file.value) return
  busy.value = true
  emit('busy', true)
  error.value = ''
  success.value = false
  try {
    const body = new FormData()
    body.append('image', file.value)
    const result = props.variationId
      ? await squareAdminApi.uploadVariationImage(props.itemId, props.variationId, body)
      : await squareAdminApi.uploadProductImage(props.itemId, body)
    imageUrl.value = result.imageUrl
    file.value = null
    if (input.value) input.value.value = ''
    success.value = true
    emit('uploaded')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Image upload failed'
  } finally {
    busy.value = false
    emit('busy', false)
  }
}
</script>
