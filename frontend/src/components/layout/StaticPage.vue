<!--
/**
 * Base layout of the public pages: SEO tags, header, content, footer.
 * @component StaticPage
 */
-->
<script setup lang="ts">
import type { Seo } from '@/data/types'
import Header from '@/components/layout/Header.vue'
import Footer from '@/components/layout/Footer.vue'
import PageSeo from '@/components/layout/PageSeo.vue'

defineProps<{ seo: Seo; path: string }>()
</script>

<template>
  <div class="static-page">
    <PageSeo :seo="seo" :path="path" />
    <Header />
    <main class="content">
      <slot />
    </main>
    <Footer />
  </div>
</template>

<style lang="scss" scoped>
.static-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.content {
  flex: 1;
  padding-top: 70px;
  margin-bottom: 44px;
}
</style>
