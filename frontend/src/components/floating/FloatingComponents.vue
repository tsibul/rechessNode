<!--
/**
 * Container for floating components that should only render on client side
 * @component FloatingComponents
 */
-->
<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

const CartBadge = defineAsyncComponent(() => import('./CartBadge.vue'))
const CookieConsent = defineAsyncComponent(() => import('./CookieConsent.vue'))
</script>

<template>
  <CartBadge />
  <CookieConsent />
</template> 