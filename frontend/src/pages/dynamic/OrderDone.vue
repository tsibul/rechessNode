<!--
/**
 * Order confirmation. The order is read by its number; only the owner (visitor token) can see it.
 * @component OrderDone
 */
-->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import ShopPage from '@/components/layout/ShopPage.vue'
import { api } from '@/services/api'

interface Order {
  number: number; sum: number; delivery_cost: number | null; state: string | null
  name: string; e_mail: string; phone: string; address_delivery: boolean; delivery_address: string
  items: Array<{ item_id: number; name: string; article: string; quantity: number; price: number; sum: number }>
}

const route = useRoute()
const order = ref<Order | null>(null)
const state = ref<'loading' | 'ok' | 'missing' | 'error'>('loading')
const rub = (n: number) => `${new Intl.NumberFormat('ru-RU').format(n)} ₽`

onMounted(async () => {
  try {
    order.value = (await api<{ order: Order }>(`/orders/${encodeURIComponent(String(route.params.number))}`)).order
    state.value = 'ok'
  } catch (e) {
    state.value = (e as { status?: number }).status === 404 ? 'missing' : 'error'
  }
})
</script>

<template>
  <ShopPage title="Заказ оформлен" path="/order">
    <p v-if="state === 'loading'">Загружаем заказ…</p>

    <div v-else-if="state === 'ok' && order" data-testid="order-done">
      <h1>Заказ № {{ order.number }} оформлен</h1>
      <p>Спасибо! Мы подтвердим заказ на {{ order.e_mail }} и сообщим номер для отслеживания посылки.</p>
      <ul class="items">
        <li v-for="i in order.items" :key="i.item_id">{{ i.name }} × {{ i.quantity }} — {{ rub(i.sum) }}</li>
      </ul>
      <p>Итого: {{ rub(order.sum) }}</p>
      <p>{{ order.delivery_cost === null ? 'Стоимость доставки будет сообщена отдельно.' : `Доставка: ${rub(order.delivery_cost)}` }}</p>
      <p>{{ order.address_delivery ? 'Доставка до двери' : 'Пункт выдачи' }}: {{ order.delivery_address }}</p>
      <p class="actions"><router-link to="/" class="btn">На главную</router-link></p>
    </div>

    <div v-else-if="state === 'missing'" data-testid="order-missing">
      <h1>Заказ не найден</h1>
      <p>Заказ можно посмотреть только в том браузере, где он был оформлен.</p>
      <p><router-link to="/shop">В магазин</router-link></p>
    </div>

    <div v-else>
      <h1>Не удалось загрузить заказ</h1>
      <p>Попробуйте обновить страницу.</p>
    </div>
  </ShopPage>
</template>

<style lang="scss" scoped>
.items {
  margin: 20px 0;

  li {
    padding: 4px 0;
  }
}

.actions {
  margin-top: 25px;
}
</style>
