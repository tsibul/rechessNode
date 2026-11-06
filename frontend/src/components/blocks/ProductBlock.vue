<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getProduct, getSetting, getShops } from '@/data/content'
import { livePrice } from '@/data/livePrice'
import { api } from '@/services/api'

const product = getProduct()
const shops = getShops()
const buyNote = getSetting('shop.buy_note')
const corporate = getSetting('shop.corporate')
const corporateTitle = getSetting('shop.corporate_title', 'Корпоративные заказы:')
// The rendered page carries the price of the build; the actual one is asked from the backend.
const currentPrice = ref(product.price)
const price = computed(() => new Intl.NumberFormat('ru-RU').format(currentPrice.value))
const nameLines = product.name.split('\n')

onMounted(async () => {
  try {
    currentPrice.value = (await api<{ price: number }>(`/products/${product.id}/price`)).price
    livePrice.value = currentPrice.value
  } catch {
    // keep the price of the build
  }
})
</script>

<template>
  <section class="product" data-testid="product">
    <h1 class="product__name"><span v-for="(l, i) in nameLines" :key="i" class="product__line">{{ l }}</span></h1>
    <p class="product__text">{{ product.description }}</p>
    <p class="product__price" data-testid="price">{{ price }} ₽</p>
    <p class="product__text"><router-link to="/colors">→ Цвета</router-link></p>
    <p v-if="buyNote" class="product__text">{{ buyNote }}</p>

    <div v-if="shops.length" class="product__text" data-testid="shops">
      <p>Где купить:</p>
      <p v-for="shop in shops" :key="shop.id" class="shop">
        <span class="product__line">{{ shop.name }}</span>
        <span class="product__line">{{ shop.address }}</span>
        <span v-if="shop.workingHours" class="product__line">{{ shop.workingHours }}</span>
        <span v-if="shop.phone" class="product__line"><a :href="`tel:${shop.phone}`">{{ shop.phone }}</a></span>
        <span v-if="shop.webSite" class="product__line"><a :href="shop.webSite" rel="noopener" target="_blank">{{ shop.webSite.replace(/^https?:\/\//, '') }}</a></span>
      </p>
    </div>

    <div v-if="corporate" class="product__text">
      <p>{{ corporateTitle }}</p>
      <p>{{ corporate }}</p>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.product {
  width: 540px;
  max-width: 100%;

  &__line {
    display: block;
  }

  &__name {
    font-size: inherit;
    font-weight: normal;
    margin-bottom: 19px;
  }

  &__text {
    margin-bottom: 19px;
    line-height: 19px;
  }

  &__price {
    margin-bottom: 19px;
  }
}

@media (max-width: 660px) {
  .product {
    &__name, &__text, &__price {
      line-height: 18px;
      margin-bottom: 18px;
    }
  }
}
</style>
