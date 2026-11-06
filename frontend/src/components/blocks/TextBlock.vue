<script setup lang="ts">
// `html` is written by the site editor in the CMS and is trusted.
defineProps<{ title?: string; hideTitle?: boolean; html: string }>()
</script>

<template>
  <article class="text">
    <h1 v-if="title" class="text__title" :class="{ 'visually-hidden': hideTitle }">{{ title }}</h1>
    <div class="text__body" v-html="html" />
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
