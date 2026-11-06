<!--
/**
 * Home page component.
 * @component IndexPage
 */
-->
<script setup lang="ts">
import StaticPage from '@/components/layout/StaticPage.vue'
import IndexContent from './content/IndexContent.vue'
import IndexSeo from './seo/IndexSeo.vue'

// Define page metadata for SSG
defineOptions({
  name: 'IndexPage',
  ssg: true
})
</script>

<template>
  <StaticPage :seo-component="IndexSeo">
    <IndexContent />
  </StaticPage>
</template>

<style lang="scss" scoped>
.index-page {
  width: 100%;
  min-height: 100vh;
}
</style> 