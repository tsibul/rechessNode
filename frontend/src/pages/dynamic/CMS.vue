<template>
  <ClientOnly>
    <CmsApp />
  </ClientOnly>
</template>

<script setup lang="ts">
import { useHead } from '@unhead/vue'
import ClientOnly from '../../components/utils/ClientOnly.vue'
import CmsApp from '../../cms/components/CmsApp.vue'
import '../../cms/cms.scss'

useHead({ title: 'CMS — reChess', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })
</script>
