<script setup lang="ts">
import { safeHtml } from '@/seo/sanitize'
// Several text columns side by side (legal page). `html` is written in the CMS, cleaned on save and again before rendering.
defineProps<{ title?: string; columns: string[] }>()
</script>

<template>
  <section class="columns" data-testid="columns">
    <h1 v-if="title" class="visually-hidden">{{ title }}</h1>
    <div v-for="(html, i) in columns" :id="i === 0 ? 'company' : i === 1 ? 'cookie' : undefined" :key="i" class="columns__col" v-html="safeHtml(html)" />
  </section>
</template>

<style lang="scss" scoped>
.columns {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 540px));
  column-gap: 30px;
  align-items: start;
  padding: 0 15px;
  scroll-margin-top: 70px;

  &__col {
    scroll-margin-top: 70px;

    :deep(p) {
      margin-bottom: 19px;
      line-height: 19px;
    }

    :deep(a) {
      text-decoration: underline;
      overflow-wrap: anywhere;
    }
  }
}

@media (max-width: 1160px) {
  .columns {
    grid-template-columns: minmax(0, 1fr);
    row-gap: 38px;
    padding: 0 20px;

    // Stacked columns are different documents: a thin line shows where the next one starts.
    &__col + &__col {
      padding-top: 19px;
      border-top: 1px solid currentColor;
    }
  }
}

@media (max-width: 660px) {
  .columns {
    padding: 0 15px;

    &__col :deep(p) {
      margin-bottom: 18px;
      line-height: 18px;
    }
  }
}
</style>
