<script setup lang="ts">
import { useHead } from '@unhead/vue'
import type { Seo } from '@/data/types'
import { getSetting } from '@/data/content'

const props = defineProps<{ seo: Seo; path: string }>()

const site = getSetting('site.url')
const image = props.seo.ogImage ? `${site}${props.seo.ogImage}` : undefined
const title = props.seo.ogTitle || props.seo.title
const description = props.seo.ogDescription || props.seo.description

// Basic tags. JSON-LD, canonical rules and counters are stage 9.
useHead({
  title: props.seo.title,
  meta: [
    { name: 'description', content: props.seo.description },
    { name: 'robots', content: props.seo.robotsIndex ? 'index, follow' : 'noindex, nofollow' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: `${site}${props.path}` },
    { property: 'og:site_name', content: getSetting('site.name') },
    { property: 'og:locale', content: 'ru_RU' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:site', content: getSetting('social.twitter') },
    ...(image ? [{ property: 'og:image', content: image }, { name: 'twitter:image', content: image }] : [])
  ],
  link: [{ rel: 'canonical', href: `${site}${props.path}` }]
})
</script>

<template>
  <!-- renders nothing -->
</template>
