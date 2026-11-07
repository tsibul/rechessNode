<!--
/**
 * Wrapper component that renders its content only on the client side
 * @component ClientOnly
 */
-->
<script setup lang="ts">
import { ref, onMounted } from 'vue'

/** Renders its content only in the browser, never during prerendering. */
defineOptions({ name: 'ClientOnly' })

const mounted = ref(false)

onMounted(() => {
  mounted.value = true
})
</script>

<template>
  <template v-if="mounted">
    <!-- @slot Content rendered only in the browser. -->
    <slot />
  </template>
</template> 