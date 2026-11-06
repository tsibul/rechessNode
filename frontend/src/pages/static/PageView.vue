<!--
/**
 * One component for every content page: renders the blocks of the page `slug`.
 * Structure is in code, texts and photos come from the content layer.
 * @component PageView
 */
-->
<script setup lang="ts">
import { computed } from 'vue'
import { getPage } from '@/data/content'
import StaticPage from '@/components/layout/StaticPage.vue'
import PhotoGrid from '@/components/blocks/PhotoGrid.vue'
import TextBlock from '@/components/blocks/TextBlock.vue'
import ProductBlock from '@/components/blocks/ProductBlock.vue'
import ShopsBlock from '@/components/blocks/ShopsBlock.vue'

const props = defineProps<{ slug: string }>()
const page = computed(() => getPage(props.slug))
const path = computed(() => (props.slug === 'index' ? '/' : `/${props.slug}`))
</script>

<template>
  <StaticPage :seo="page.seo" :path="path">
    <template v-for="(block, i) in page.blocks" :key="i">
      <PhotoGrid v-if="block.code === 'gallery'" :photos="block.photos" />
      <TextBlock v-else-if="block.code === 'text'" :title="block.title" :html="block.html" />
      <ProductBlock v-else-if="block.code === 'product'" />
      <ShopsBlock v-else-if="block.code === 'shops'" />
    </template>
  </StaticPage>
</template>
