<!--
/**
 * Base layout component for static pages.
 * Includes shared header, footer and client-side components.
 * @component StaticPage
 */
-->
<script setup lang="ts">
import Header from '@/components/layout/Header.vue'
import Footer from '@/components/layout/Footer.vue'

// Props
defineProps<{
  seoComponent?: any
}>()
</script>

<template>
  <div class="static-page">
    <!-- SEO -->
    <component :is="seoComponent" v-if="seoComponent" />

    <!-- Header -->
    <Header />

    <!-- Page Content -->
    <main class="content">
      <slot />
    </main>

    <!-- Footer -->
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
}
</style>
