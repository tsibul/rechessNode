<!--
/**
 * Wrapper component that renders its content only on the client side
 * @component ClientOnly
 */
-->
<script setup lang="ts">
import { ref, onMounted } from 'vue'

const mounted = ref(false)

onMounted(() => {
  mounted.value = true
})
</script>

<template>
  <template v-if="mounted">
    <slot />
  </template>
</template> 