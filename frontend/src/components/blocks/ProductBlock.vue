<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getProduct } from '@/data/content'
import { livePrice } from '@/data/livePrice'
import { api } from '@/services/api'
import { useCartStore } from '@/store/cart'
import PhotoItem from './PhotoItem.vue'

const product = getProduct()
const selectedId = ref(product.pairs[0]?.id ?? 0)
const selected = computed(() => product.pairs.find((p) => p.id === selectedId.value) ?? product.pairs[0])
const added = ref(false)
const failed = ref<string | null>(null)
const busy = ref(false)
// The rendered page carries the price of the build; the actual one is asked from the backend.
const currentPrice = ref(product.price)
const price = computed(() => new Intl.NumberFormat('ru-RU').format(currentPrice.value))

onMounted(async () => {
  try {
    currentPrice.value = (await api<{ price: number }>(`/products/${product.id}/price`)).price
    livePrice.value = currentPrice.value
  } catch {
    // keep the price of the build
  }
})

async function buy() {
  if (!selected.value || busy.value) return
  busy.value = true
  added.value = false
  failed.value = null
  try {
    await useCartStore().add(selected.value.id)
    added.value = true
  } catch (e) {
    failed.value = (e as { status?: number }).status === 429
      ? 'Слишком много запросов, попробуйте через минуту.'
      : 'Не удалось добавить в корзину. Попробуйте ещё раз.'
  } finally {
    busy.value = false
  }
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
      <button type="button" class="product__buy" :disabled="busy" @click="buy">В корзину</button>
      <p v-if="added" class="product__added" role="status">Добавлено в корзину. <router-link to="/cart">Перейти в корзину</router-link></p>
      <p v-if="failed" class="product__added" role="alert">{{ failed }}</p>
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
