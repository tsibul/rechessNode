<script setup lang="ts">
import type { Photo } from '@/data/types'
import PhotoItem from './PhotoItem.vue'

defineProps<{ photos: Photo[] }>()
</script>

<template>
  <section class="grid" data-testid="photo-grid">
    <figure v-for="(p, i) in photos" :key="i" class="grid__item">
      <PhotoItem :photo="p" />
    </figure>
  </section>
</template>

<style lang="scss" scoped>
.grid {
  column-count: 3;
  column-gap: 30px;
  padding: 0 15px;

  &__item {
    break-inside: avoid;
    margin-bottom: 30px;
  }
}

// iPad
@media (max-width: 1160px) {
  .grid {
    column-count: 2;
  }
}

// Mobile
@media (max-width: 660px) {
  .grid {
    column-count: 1;

    &__item {
      margin-bottom: 15px;
    }
  }
}
</style>
