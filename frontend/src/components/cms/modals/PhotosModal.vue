<template>
  <div class="photos-modal">
    <!-- CRUD для фото -->
  </div>
</template>

<script setup lang="ts">
defineProps<{
  type: 'main' | 'shop' | 'item'
}>()

defineEmits<{
  close: []
}>()
</script>

<style scoped>
</style> 