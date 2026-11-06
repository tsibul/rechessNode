<script setup lang="ts">
// `html` is written by the site editor in the CMS and is trusted.
defineProps<{ title?: string; html: string }>()
</script>

<template>
  <article class="text">
    <h1 v-if="title" class="text__title">{{ title }}</h1>
    <div class="text__body" v-html="html" />
  </article>
</template>

<style lang="scss" scoped>
.text {
  max-width: 720px;
  padding: 0 15px;

  &__title {
    font-size: 17px;
    margin-bottom: 30px;
  }

  &__body :deep(p) {
    margin-bottom: 15px;
    line-height: 22px;
  }

  &__body :deep(h2) {
    margin: 30px 0 15px;
  }

  &__body :deep(a) {
    text-decoration: underline;
  }
}
</style>
