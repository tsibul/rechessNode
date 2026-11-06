<script setup lang="ts">
import { ref } from 'vue'
import { cmsApi, errorMessage } from '../api'
import { photoUrl } from '../logic'

const props = defineProps<{ modelValue: string | null }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string | null): void }>()

const busy = ref(false)
const error = ref('')

async function onFile(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  busy.value = true
  error.value = ''
  try {
    emit('update:modelValue', await cmsApi.upload(file))
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = false
    input.value = ''
  }
}
</script>

<template>
  <div class="cms-photo">
    <img v-if="props.modelValue" :src="photoUrl(props.modelValue)!" alt="" class="cms-photo__img" />
    <div v-else class="cms-photo__empty">нет файла</div>
    <div class="cms-photo__actions">
      <label class="cms-btn">
        {{ busy ? 'Загрузка…' : props.modelValue ? 'Заменить' : 'Загрузить' }}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden :disabled="busy" @change="onFile" />
      </label>
      <button v-if="props.modelValue" type="button" class="cms-btn cms-btn--ghost" @click="emit('update:modelValue', null)">
        Убрать
      </button>
    </div>
    <p v-if="error" class="cms-error">{{ error }}</p>
  </div>
</template>
