<script setup lang="ts">
// Several text columns side by side (legal page). `html` is written in the CMS and is trusted.
defineProps<{ title?: string; columns: string[] }>()
</script>

<template>
  <section class="columns" data-testid="columns">
    <h1 v-if="title" class="visually-hidden">{{ title }}</h1>
    <div v-for="(html, i) in columns" :id="i === 0 ? 'company' : undefined" :key="i" class="columns__col" v-html="html" />
  </section>
</template>

<style lang="scss" scoped>
.columns {
  display: grid;
  grid-template-columns: repeat(3, 540px);
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
    }
  }
}

@media (max-width: 1160px) {
  .columns {
    grid-template-columns: minmax(0, 1fr);
    row-gap: 19px;
    padding: 0 20px;
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
