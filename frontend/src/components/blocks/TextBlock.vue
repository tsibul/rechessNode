<script setup lang="ts">
import { safeHtml } from '@/seo/sanitize'

/** Page block with a title and HTML text. */
defineOptions({ name: 'TextBlock' })
// `html` is written in the CMS; it is cleaned on save and again here before rendering.
defineProps<{
  /** Heading. */
  title?: string
  /** Hide the heading visually, keep it for screen readers. */
  hideTitle?: boolean
  /** HTML text, sanitized before output. */
  html: string
}>()
</script>

<template>
  <article class="text">
    <h1 v-if="title" class="text__title" :class="{ 'visually-hidden': hideTitle }">{{ title }}</h1>
    <div class="text__body" v-html="safeHtml(html)" />
  </article>
</template>

<style lang="scss" scoped>
.text {
  width: 540px;
  max-width: 100%;
  padding: 0 15px;
  box-sizing: content-box;

  &__title {
    font-size: 17px;
    margin-bottom: 30px;
  }

  &__body :deep(p) {
    margin-bottom: 19px;
    line-height: 19px;
  }

  &__body :deep(h2) {
    margin: 30px 0 15px;
  }

  &__body :deep(a) {
    text-decoration: underline;
  }
}

@media (max-width: 1160px) {
  .text {
    padding: 0 20px;
    // content-box: the padding must not push the block out of the screen
    max-width: calc(100% - 40px);
  }
}

@media (max-width: 660px) {
  .text {
    padding: 0 15px;
    max-width: calc(100% - 30px);

    &__body :deep(p) {
      margin-bottom: 18px;
      line-height: 18px;
    }
  }
}
</style>
