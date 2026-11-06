<!--
/**
 * Floating cart badge component that displays the current number of items in the cart.
 * @component CartBadge
 */
-->
<script setup lang="ts">
import {computed} from 'vue'
import {useCartStore} from '@/store/cart'

const cartStore = useCartStore()
const itemCount = computed(() => cartStore.totalItems())
</script>

<template>
  <div class="cart-badge" data-testid="cart-badge">
    ({{ itemCount }})
  </div>
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
  width: 46px;
  height: 46px;
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
