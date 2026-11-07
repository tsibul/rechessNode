<script setup lang="ts">
import { computed } from 'vue'
import { useHead } from '@unhead/vue'
import type { Photo, Seo } from '@/data/types'
import { getProduct, getSeller, getSettings } from '@/data/content'
import { livePrice } from '@/data/livePrice'
import { buildHead } from '@/seo/head'

/** Sets title, meta tags and structured data of a page. */
defineOptions({ name: 'PageSeo' })

const props = defineProps<{
  /** SEO fields of the page. */
  seo: Seo
  /** Path of the page. */
  path: string
  /** Add product structured data. */
  withProduct?: boolean
  /** Photos used for the share image. */
  photos?: Photo[]
}>()

const fallbackImage = computed(() => props.photos?.find((p) => p.src)?.src ?? null)

// Reactive: the JSON-LD price follows the one the backend answered in the browser.
useHead(() => {
  const product = getProduct()
  return buildHead({
    seo: props.seo,
    path: props.path,
    settings: getSettings(),
    seller: getSeller(),
    fallbackImage: fallbackImage.value,
    product: props.withProduct ? { data: product, price: livePrice.value ?? product.price } : null
  })
})
</script>

<template>
  <!-- renders nothing -->
</template>
