<!--
/**
 * Payment stub page: no money is charged. "Paid" and "Declined" send the notification a real
 * payment service would send; then the buyer sees the confirmation or can repeat the payment.
 * @component OrderPay
 */
-->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ShopPage from '@/components/layout/ShopPage.vue'
import { api } from '@/services/api'
import { getSetting } from '@/data/content'

interface Payment { provider: string | null; state: string; amount: number; url: string | null; ref: string | null; stub: boolean }

const route = useRoute()
const router = useRouter()
const number = String(route.params.number)
const payment = ref<Payment | null>(null)
const state = ref<'loading' | 'ok' | 'missing' | 'error'>('loading')
const busy = ref(false)
const declined = ref(false)
const message = ref<string | null>(null)
/** Text from the CMS (setting shop.order_stub_text). */
const stubText = getSetting('shop.order_stub_text', 'Оплата на сайте пока не подключена. Мы свяжемся с вами по телефону или почте, уточним детали заказа и расскажем, как оплатить.')
const rub = (n: number) => `${new Intl.NumberFormat('ru-RU').format(n)} ₽`

async function load() {
  try {
    payment.value = (await api<{ payment: Payment }>(`/orders/${encodeURIComponent(number)}/payment`)).payment
    declined.value = payment.value.state === 'failed'
    state.value = 'ok'
    // Nothing left to pay (already paid): go to the confirmation.
    if (payment.value.state === 'paid') await router.replace(`/order/${number}`)
  } catch (e) {
    state.value = (e as { status?: number }).status === 404 ? 'missing' : 'error'
  }
}

async function answer(result: 'paid' | 'failed') {
  if (!payment.value?.ref || busy.value) return
  busy.value = true
  message.value = null
  try {
    await api('/payments/stub/notify', { method: 'POST', body: { ref: payment.value.ref, result } })
    if (result === 'paid') await router.push(`/order/${number}`)
    else await load()
  } catch {
    message.value = 'Не удалось передать результат оплаты. Повторите.'
  } finally {
    busy.value = false
  }
}

async function retry() {
  busy.value = true
  message.value = null
  try {
    payment.value = (await api<{ payment: Payment }>(`/orders/${encodeURIComponent(number)}/payment`, { method: 'POST' })).payment
    declined.value = false
  } catch {
    message.value = 'Не удалось начать оплату заново. Повторите.'
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>

<template>
  <ShopPage title="Оплата заказа" path="/order">
    <p v-if="state === 'loading'">Загружаем оплату…</p>

    <div v-else-if="state === 'ok' && payment" data-testid="pay">
      <h1>Оплата заказа № {{ number }}</h1>
      <p class="stub-note" data-testid="pay-stub-note">
        {{ stubText }}
      </p>
      <p>К оплате: <b data-testid="pay-amount">{{ rub(payment.amount) }}</b></p>

      <div v-if="declined" data-testid="pay-declined">
        <p>Оплата не прошла. Заказ сохранён, можно повторить.</p>
        <p class="actions">
          <button type="button" class="btn" :disabled="busy" data-testid="pay-retry" @click="retry">Повторить оплату</button>
          <router-link :to="`/order/${number}`" class="btn">К заказу</router-link>
        </p>
      </div>
      <p v-else-if="payment.ref" class="actions">
        <button type="button" class="btn" :disabled="busy" data-testid="pay-ok" @click="answer('paid')">Оплачено</button>
        <button type="button" class="btn" :disabled="busy" data-testid="pay-fail" @click="answer('failed')">Отказ</button>
      </p>
      <p v-else>Для этого заказа оплата не ожидается. <router-link :to="`/order/${number}`">К заказу</router-link></p>
      <p v-if="message" class="error" role="alert">{{ message }}</p>
    </div>

    <div v-else-if="state === 'missing'" data-testid="order-missing">
      <h1>Заказ не найден</h1>
      <p><router-link to="/shop">В магазин</router-link></p>
    </div>

    <div v-else>
      <h1>Не удалось загрузить оплату</h1>
      <p>Попробуйте обновить страницу.</p>
    </div>
  </ShopPage>
</template>

<style lang="scss" scoped>
.stub-note {
  margin: 16px 0;
  padding: 12px 16px;
  border: 2px dashed currentColor;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
}

.error {
  margin-top: 12px;
  color: #b00020;
}
</style>
