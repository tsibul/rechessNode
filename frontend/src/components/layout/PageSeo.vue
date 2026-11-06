<script setup lang="ts">
import { computed } from 'vue'
import { useHead } from '@unhead/vue'
import type { Photo, Seo } from '@/data/types'
import { getProduct, getSeller, getSettings } from '@/data/content'
import { livePrice } from '@/data/livePrice'
import { buildHead } from '@/seo/head'

const props = defineProps<{ seo: Seo; path: string; withProduct?: boolean; photos?: Photo[] }>()

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
