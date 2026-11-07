<!--
/**
 * Layout of the non-indexed shop pages (cart, order, confirmation): header, content, footer.
 * @component ShopPage
 */
-->
<script setup lang="ts">
import StaticPage from '@/components/layout/StaticPage.vue'

/** Layout of shop pages (cart, order) that are not indexed. */
defineOptions({ name: 'ShopPage' })

const props = defineProps<{
  /** Page title. */
  title: string
  /** Path of the page. */
  path: string
}>()
const seo = { title: `${props.title} — reChess`, description: props.title, robotsIndex: false }
</script>

<template>
  <StaticPage :seo="seo" :path="path">
    <div class="shop-page">
      <!-- @slot Content of the page. -->
      <slot />
    </div>
  </StaticPage>
</template>

<style lang="scss">
@use '../../styles/shop';
</style>
