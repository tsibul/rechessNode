<template>
  <ClientOnly>
    <CmsApp />
  </ClientOnly>
</template>

<script setup lang="ts">
import ClientOnly from '../../components/utils/ClientOnly.vue'
import CmsApp from '../../cms/components/CmsApp.vue'
import '../../cms/cms.scss'
</script>
