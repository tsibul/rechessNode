<script setup lang="ts">
import { computed, ref } from 'vue'
import { getProduct } from '@/data/content'
import { useCartStore } from '@/store/cart'
import PhotoItem from './PhotoItem.vue'

const product = getProduct()
const selectedId = ref(product.pairs[0]?.id ?? 0)
const selected = computed(() => product.pairs.find((p) => p.id === selectedId.value) ?? product.pairs[0])
const added = ref(false)
const price = computed(() => new Intl.NumberFormat('ru-RU').format(product.price))

async function buy() {
  if (!selected.value) return
  // Local cart until the server cart of stage 7; the item id is the colour pair.
  await useCartStore().addItem({ id: selected.value.id, name: `${product.name}, ${selected.value.name}`, price: product.price, quantity: 1 })
  added.value = true
}
</script>

<template>
  <section class="product" data-testid="product">
    <div class="product__photos">
      <PhotoItem v-for="(p, i) in selected?.photos" :key="i" :photo="p" />
    </div>
    <div class="product__info">
      <h1 class="product__name">{{ product.name }}</h1>
      <p class="product__text">{{ product.description }}</p>

      <fieldset class="pairs">
        <legend class="pairs__legend">Пара цветов</legend>
        <label v-for="pair in product.pairs" :key="pair.id" class="pairs__item" :class="{ 'pairs__item--active': pair.id === selectedId }">
          <input v-model="selectedId" type="radio" name="pair" :value="pair.id" class="pairs__input">
          <span class="pairs__swatch" :style="{ backgroundColor: pair.main.hex }" />
          <span class="pairs__swatch" :style="{ backgroundColor: pair.second.hex }" />
          <span class="pairs__name">{{ pair.name }}</span>
        </label>
      </fieldset>

      <p class="product__price" data-testid="price">{{ price }} ₽</p>
      <button type="button" class="product__buy" @click="buy">В корзину</button>
      <p v-if="added" class="product__added" role="status">Добавлено в корзину</p>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '../../styles/vars' as *;
@use '../../styles/mixins' as *;

.product {
  display: flex;
  gap: 30px;
  padding: 0 15px;

  &__photos {
    width: 540px;
    flex-shrink: 0;
  }

  &__info {
    max-width: 420px;
  }

  &__name {
    font-size: 17px;
    margin-bottom: 15px;
  }

  &__text {
    line-height: 22px;
    margin-bottom: 30px;
  }

  &__price {
    margin: 30px 0 15px;
  }

  &__buy {
    height: 40px;
    padding: 0 30px;
    border: none;
    border-radius: 5px;
    background: $colorPrimary500;
    color: $colorPrimary900;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: $colorPrimary900;
      color: #fff;
    }
  }

  &__added {
    margin-top: 15px;
  }
}

.pairs {
  border: none;

  &__legend {
    margin-bottom: 8px;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    cursor: pointer;

    &--active .pairs__name {
      text-decoration: underline;
    }
  }

  &__input {
    position: absolute;
    opacity: 0;
    pointer-events: none;

    &:focus-visible ~ .pairs__name {
      outline: 1px solid $colorPrimary900;
    }
  }

  &__swatch {
    width: 20px;
    height: 20px;
    border-radius: 10px;
    border: 1px solid $colorPrimary500;
  }
}

@media (max-width: 1160px) {
  .product {
    flex-direction: column;

    &__photos {
      width: 100%;
      max-width: 540px;
    }
  }
}
</style>
