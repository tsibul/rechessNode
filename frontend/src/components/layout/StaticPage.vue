<!--
/**
 * Base layout of the public pages: SEO tags, header, content, footer.
 * @component StaticPage
 */
-->
<script setup lang="ts">
import type { Photo, Seo } from '@/data/types'
import Header from '@/components/layout/Header.vue'
import Footer from '@/components/layout/Footer.vue'
import PageSeo from '@/components/layout/PageSeo.vue'

/** Page layout: SEO tags, header, content and footer. */
defineOptions({ name: 'StaticPage' })

defineProps<{
  /** SEO fields of the page. */
  seo: Seo
  /** Path of the page. */
  path: string
  /** Add product structured data. */
  withProduct?: boolean
  /** Photos used for the share image. */
  photos?: Photo[]
}>()
</script>

<template>
  <div class="static-page">
    <PageSeo :seo="seo" :path="path" :with-product="withProduct" :photos="photos" />
    <Header />
    <main class="content">
      <!-- @slot Main content of the page. -->
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
