<!--
/**
 * Floating cart badge: link to the cart with the number of pieces.
 * The number comes from the server cart (the readable cookie until it is loaded).
 * @component CartBadge
 */
-->
<script setup lang="ts">
import {onMounted} from 'vue'
import {useCartStore} from '@/store/cart'

const cart = useCartStore()

onMounted(() => {
  cart.initCount()
  cart.load().catch(() => {})
})
</script>

<template>
  <router-link to="/cart" class="cart-badge" data-testid="cart-badge" aria-label="Корзина">
    ({{ cart.count }})
  </router-link>
</template>

<style lang="scss" scoped>
@use '../../styles/vars' as *;
@use '../../styles/mixins' as *;

.cart-badge {
  position: fixed;
  bottom: 30px;
  right: 30px;
  background-color: $colorPrimary500;
  color: $colorPrimary900;
  border-radius: 23px;
  min-width: 46px;
  height: 46px;
  padding: 0 10px;
  @include flex-center;
  font-size: 17px;
  line-height: 19px;
  z-index: 1000;
  transition: background-color 0.2s;

  &:hover {
    background-color: $colorPrimary900;
    color: white;
  }
}
</style>
