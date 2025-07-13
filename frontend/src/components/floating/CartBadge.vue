<!--
/**
 * Floating cart badge component that displays the current number of items in the cart.
 * @component CartBadge
 */
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useCartStore } from '@/store/cart'

const cartStore = useCartStore()
const itemCount = computed(() => cartStore.totalItems())
</script>

<template>
  <div class="cart-badge" data-testid="cart-badge">
    {{ itemCount }}
  </div>
</template>

<style scoped>
.cart-badge {
  position: fixed;
  top: 1rem;
  right: 1rem;
  background-color: #e53e3e;
  color: white;
  border-radius: 9999px;
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  z-index: 50;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.cart-badge:hover {
  transform: scale(1.1);
}
</style> 