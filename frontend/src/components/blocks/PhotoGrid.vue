<script setup lang="ts">
import type { Photo } from '@/data/types'
import PhotoItem from './PhotoItem.vue'

/** Grid of photos. */
defineOptions({ name: 'PhotoGrid' })

// `column`: one column of a page grid (shop); default: two columns, row by row (home).
defineProps<{
  /** Photos to show. */
  photos: Photo[]
  /** Show in a single column. */
  column?: boolean
}>()
</script>

<template>
  <section class="grid" :class="{ 'grid--column': column }" data-testid="photo-grid">
    <figure v-for="(p, i) in photos" :key="i" class="grid__item">
      <PhotoItem :photo="p" />
    </figure>
  </section>
</template>

<style lang="scss" scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(2, 540px);
  column-gap: 30px;
  padding: 0 15px;

  &--column {
    display: block;
    width: 540px;
    padding: 0;
  }

  &__item {
    margin: 0 0 30px;
    // Photos take 80% of the 540 px column, as in the layout.
    width: 80%;
  }
}

// iPad
@media (max-width: 1160px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 0 20px;

    &--column {
      width: auto;
      padding: 0;
    }

    &__item {
      width: 65%;
    }
  }
}

// Mobile
@media (max-width: 660px) {
  .grid {
    grid-template-columns: minmax(0, 1fr);
    padding: 0 15px;

    &--column {
      padding: 0;
    }

    &__item {
      margin-bottom: 15px;
      width: 80%;
    }
  }
}
</style>
