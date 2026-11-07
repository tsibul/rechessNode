<!--
/**
 * One component for every content page: renders the blocks of the page `slug`.
 * Structure is in code, texts and photos come from the content layer.
 * @component PageView
 */
-->
<script setup lang="ts">
import { computed } from 'vue'
import { getPage, getProduct } from '@/data/content'
import StaticPage from '@/components/layout/StaticPage.vue'
import PhotoGrid from '@/components/blocks/PhotoGrid.vue'
import TextBlock from '@/components/blocks/TextBlock.vue'
import ProductBlock from '@/components/blocks/ProductBlock.vue'
import ColorsBlock from '@/components/blocks/ColorsBlock.vue'
import ColumnsBlock from '@/components/blocks/ColumnsBlock.vue'

/** Renders a prerendered page from its blocks. */
defineOptions({ name: 'PageView' })

const props = defineProps<{
  /** Slug of the page to render. */
  slug: string
}>()
const page = computed(() => getPage(props.slug))
const withProduct = computed(() => page.value.blocks.some((b) => b.code === 'product'))
// Photos of the page, the first one is the social card when the SEO has no image.
const photos = computed(() => [
  ...page.value.blocks.flatMap((b) => (b.code === 'gallery' ? b.photos : [])),
  ...(withProduct.value || page.value.blocks.some((b) => b.code === 'colors') ? getProduct().pairs.flatMap((p) => p.photos) : [])
])
// Every page needs one h1 for search engines and screen readers; when no block brings it, the page name is added (hidden).
const needsH1 = computed(() => !page.value.blocks.some((b) =>
  b.code === 'product' || b.code === 'columns' && !!b.title || (b.code === 'text' && (b.title || /<h1[\s>]/i.test(b.html)))))
const path = computed(() => (props.slug === 'index' ? '/' : `/${props.slug}`))
</script>

<template>
  <StaticPage :seo="page.seo" :path="path" :with-product="withProduct" :photos="photos">
    <h1 v-if="needsH1" class="visually-hidden">{{ page.name }}</h1>
    <div :class="{ 'two-columns': withProduct }">
      <template v-for="(block, i) in page.blocks" :key="i">
        <PhotoGrid v-if="block.code === 'gallery'" :photos="block.photos" :column="withProduct" />
        <TextBlock v-else-if="block.code === 'text'" :title="block.title" :hide-title="block.hideTitle" :html="block.html" />
        <ColumnsBlock v-else-if="block.code === 'columns'" :title="block.title" :columns="block.columns" />
        <ProductBlock v-else-if="block.code === 'product'" />
        <ColorsBlock v-else-if="block.code === 'colors'" />
      </template>
    </div>
  </StaticPage>
</template>

<style lang="scss" scoped>
// Shop: text column on the left, photo column on the right.
.two-columns {
  display: grid;
  grid-template-columns: 540px 540px;
  column-gap: 30px;
  align-items: start;
  padding: 0 15px;
}

@media (max-width: 1160px) {
  .two-columns {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    padding: 0 20px;
  }
}

@media (max-width: 660px) {
  .two-columns {
    grid-template-columns: minmax(0, 1fr);
    padding: 0 15px;
  }
}
</style>


<style lang="scss">
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
</style>
