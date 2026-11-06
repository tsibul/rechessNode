<script setup lang="ts">
import type { Photo } from '@/data/types'

defineProps<{ photo: Photo }>()
</script>

<template>
  <img
    v-if="photo.src"
    class="photo"
    :src="photo.src"
    :alt="photo.alt"
    :style="{ aspectRatio: String(photo.ratio) }"
    loading="lazy"
  >
  <div
    v-else
    class="photo photo--placeholder"
    role="img"
    :aria-label="photo.alt"
    :style="{ aspectRatio: String(photo.ratio) }"
  />
</template>

<style lang="scss" scoped>
.photo {
  display: block;
  width: 100%;
  height: auto;
  object-fit: cover;

  &--placeholder {
    background-color: #efefef;
  }
}
</style>
