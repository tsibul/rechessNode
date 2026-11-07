<!--
/**
 * Cart of the anonymous visitor (server cart). Prices and sums are the backend's.
 * @component Cart
 */
-->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ShopPage from '@/components/layout/ShopPage.vue'
import { uploadUrl } from '@/data/api'
import { useCartStore } from '@/store/cart'

/** Cart page. */
defineOptions({ name: 'Cart' })

const cart = useCartStore()
const failed = ref<string | null>(null)
const rub = (n: number) => `${new Intl.NumberFormat('ru-RU').format(n)} ₽`

onMounted(() => cart.load().catch(() => { failed.value = 'Не удалось загрузить корзину. Обновите страницу.' }))

async function change(fn: () => Promise<void>) {
  failed.value = null
  try {
    await fn()
  } catch {
    failed.value = 'Не удалось изменить корзину. Попробуйте ещё раз.'
  }
}
</script>

<template>
  <ShopPage title="Корзина" path="/cart">
    <h1>Корзина</h1>
    <p v-if="failed" class="notice" role="alert">{{ failed }}</p>

    <p v-if="!cart.loaded && !failed" data-testid="cart-loading">Загружаем корзину…</p>

    <div v-else-if="cart.isEmpty && !failed" data-testid="cart-empty">
      <p>В корзине пока ничего нет.</p>
      <p><router-link to="/shop">Выбрать шахматы</router-link></p>
    </div>

    <div v-else-if="cart.loaded">
      <ul class="lines">
        <li v-for="line in cart.items" :key="line.item_id" class="line" data-testid="cart-line">
          <img v-if="line.photo" :src="uploadUrl(line.photo)" :alt="line.name" class="line__photo">
          <div class="line__info">
            <p v-if="line.product_name" class="line__product" data-testid="cart-product">{{ line.product_name }}</p>
            <p>{{ line.name }}</p>
            <p class="line__muted">Артикул {{ line.article }}, {{ rub(line.price) }}</p>
          </div>
          <div class="line__qty">
            <button type="button" class="qty-btn" :disabled="cart.loading" aria-label="Меньше" @click="change(() => cart.setQuantity(line.item_id, line.quantity - 1))">−</button>
            <span data-testid="qty">{{ line.quantity }}</span>
            <button type="button" class="qty-btn" :disabled="cart.loading || line.quantity >= 99" aria-label="Больше" @click="change(() => cart.setQuantity(line.item_id, line.quantity + 1))">+</button>
          </div>
          <p class="line__sum">{{ rub(line.sum) }}</p>
          <button type="button" class="btn-link" :disabled="cart.loading" @click="change(() => cart.remove(line.item_id))">Удалить</button>
        </li>
      </ul>
      <p class="total" data-testid="cart-total">Итого: {{ rub(cart.total) }}</p>
      <p class="line__muted">Стоимость доставки не включена.</p>
      <p class="actions"><router-link to="/order" class="btn" data-testid="to-order">Оформить заказ</router-link></p>
    </div>
  </ShopPage>
</template>

<style lang="scss" scoped>
@use '../../styles/vars' as *;

.lines {
  border-top: 1px solid $colorPrimary500;
}

.line {
  display: grid;
  grid-template-columns: 70px 1fr auto 100px auto;
  align-items: center;
  gap: 15px;
  padding: 15px 0;
  border-bottom: 1px solid $colorPrimary500;

  &__photo {
    width: 70px;
    height: 70px;
    object-fit: cover;
  }

  &__product {
    font-weight: bold;
  }

  &__muted {
    color: $colorPrimary500;
  }

  &__qty {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__sum {
    text-align: right;
  }
}

.qty-btn {
  width: 30px;
  height: 30px;
  border: 1px solid $colorPrimary500;
  border-radius: 5px;
  cursor: pointer;
}

.total {
  margin: 20px 0 5px;
  text-align: right;
}

.actions {
  margin-top: 25px;
}

@media (max-width: 660px) {
  .line {
    grid-template-columns: 56px 1fr auto;

    &__photo {
      width: 56px;
      height: 56px;
    }

    &__sum {
      text-align: left;
    }
  }
}
</style>
