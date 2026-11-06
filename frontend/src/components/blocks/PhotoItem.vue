<script setup lang="ts">
import { computed } from 'vue'
import type { Photo } from '@/data/types'
import { pictureSources } from '@/seo/picture'

const props = defineProps<{ photo: Photo }>()
const sources = computed(() => pictureSources(props.photo.src))
</script>

<template>
  <picture v-if="photo.src">
    <source v-for="s in sources" :key="s.type" :type="s.type" :srcset="s.srcset">
    <img
      class="photo"
      :src="photo.src"
      :alt="photo.alt"
      :style="{ aspectRatio: String(photo.ratio) }"
      loading="lazy"
    >
  </picture>
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
