<!--
/**
 * Order confirmation. The order is read by its number; only the owner (visitor token) can see it.
 * @component OrderDone
 */
-->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import ShopPage from '@/components/layout/ShopPage.vue'
import { api } from '@/services/api'
import { uploadUrl } from '@/data/api'
import { getSetting } from '@/data/content'

/** Page shown after an order is placed. */
defineOptions({ name: 'OrderDone' })

interface Order {
  number: number; sum: number; delivery_cost: number | null; state: string | null
  email_confirm?: 'pending' | 'confirmed' | 'expired'
  tracking_url?: string | null; delivery_reference?: string | null
  payment_state?: string; payment?: { url: string | null; state: string } | null
  name: string; e_mail: string; phone: string; address_delivery: boolean; delivery_address: string
  items: Array<{ item_id: number; name: string; product_name: string; photo: string | null; article: string; quantity: number; price: number; sum: number }>
}

const route = useRoute()
const order = ref<Order | null>(null)
const state = ref<'loading' | 'ok' | 'missing' | 'error'>('loading')
const stubText = getSetting('shop.order_stub_text', 'Оплата на сайте пока не подключена: после заказа мы свяжемся с вами по телефону или почте и уточним детали. Нажмите «Оплатить», если вы согласны.')
const pendingFor = (email: string) => pendingText.split('{' + '{email}}').join(email)
const pendingText = getSetting('shop.confirm.pending', 'Мы отправили письмо на {{email}}. Подтвердите заказ по ссылке из письма.')
const expiredText = getSetting('shop.confirm.expired', 'Заказ отменён: адрес почты не был подтверждён в течение 24 часов.')
const busy = ref(false)
const notice = ref<string | null>(null)
const editing = ref(false)
const newEmail = ref('')
let timer: ReturnType<typeof setInterval> | undefined
const rub = (n: number) => `${new Intl.NumberFormat('ru-RU').format(n)} ₽`

async function load() {
  try {
    order.value = (await api<{ order: Order }>(`/orders/${encodeURIComponent(String(route.params.number))}`)).order
    state.value = 'ok'
    if (order.value.email_confirm !== 'pending' && timer) { clearInterval(timer); timer = undefined }
  } catch (e) {
    state.value = (e as { status?: number }).status === 404 ? 'missing' : 'error'
  }
}

/** Sends the mail with the link again or to a corrected address. */
async function sendLink(path: string, body?: Record<string, string>) {
  if (busy.value) return
  busy.value = true
  notice.value = null
  try {
    await api(`/orders/${encodeURIComponent(String(route.params.number))}/confirm/${path}`, { method: 'POST', body: body ?? {} })
    notice.value = 'Письмо отправлено.'
    editing.value = false
    await load()
  } catch (e) {
    const status = (e as { status?: number }).status
    notice.value = status === 429 ? 'Письмо можно отправить не чаще раза в минуту и не больше трёх раз. Попробуйте позже.' : 'Не удалось отправить письмо. Попробуйте позже.'
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  await load()
  // The buyer confirms in the mail, this page notices it.
  if (order.value?.email_confirm === 'pending') timer = setInterval(load, 5000)
})
onBeforeUnmount(() => { if (timer) clearInterval(timer) })
</script>

<template>
  <ShopPage title="Заказ оформлен" path="/order">
    <p v-if="state === 'loading'">Загружаем заказ…</p>

    <div v-else-if="state === 'ok' && order" data-testid="order-done">
      <h1 v-if="order.email_confirm === 'pending'">Заказ № {{ order.number }}: подтвердите почту</h1>
      <h1 v-else-if="order.email_confirm === 'expired'">Заказ № {{ order.number }} отменён</h1>
      <h1 v-else>Заказ № {{ order.number }} оформлен</h1>
      <template v-if="order.email_confirm === 'pending'">
        <p data-testid="order-confirm-pending">{{ pendingFor(order.e_mail) }}</p>
        <p class="confirm__actions">
          <button type="button" class="btn" :disabled="busy" data-testid="confirm-resend" @click="sendLink('resend')">Отправить ещё раз</button>
          <button type="button" class="btn" :disabled="busy" data-testid="confirm-change" @click="editing = !editing; newEmail = order.e_mail">Изменить адрес</button>
        </p>
        <form v-if="editing" class="confirm__form" data-testid="confirm-email-form" @submit.prevent="sendLink('email', { e_mail: newEmail })">
          <input v-model="newEmail" type="email" name="confirm_email" required maxlength="255" autocomplete="email">
          <button type="submit" class="btn" :disabled="busy" data-testid="confirm-email-save">Отправить на этот адрес</button>
        </form>
        <p v-if="notice" role="status" data-testid="confirm-notice">{{ notice }}</p>
      </template>
      <p v-else-if="order.email_confirm === 'expired'" data-testid="order-confirm-expired">{{ expiredText }}</p>
      <p v-else>Спасибо! Мы подтвердим заказ на {{ order.e_mail }} и сообщим номер для отслеживания посылки.</p>
      <ul class="items">
        <li v-for="i in order.items" :key="i.item_id" class="items__line">
          <img v-if="i.photo" :src="uploadUrl(i.photo)" :alt="i.name" class="items__photo">
          <span><template v-if="i.product_name">{{ i.product_name }}, </template>{{ i.name }} × {{ i.quantity }} — {{ rub(i.sum) }}</span>
        </li>
      </ul>
      <p v-if="order.delivery_cost !== null">Доставка: {{ rub(order.delivery_cost) }}</p>
      <p>Итого: {{ rub(order.sum) }}</p>
      <p v-if="order.payment_state === 'paid'" data-testid="order-paid">Оплата получена.</p>
      <template v-else-if="order.payment && order.email_confirm === 'confirmed'">
      <p v-if="order.payment.state !== 'failed'" data-testid="order-contact-note">{{ stubText }}</p>
      <p data-testid="order-unpaid">
        {{ order.payment.state === 'failed' ? 'Оплата не прошла.' : 'Заказ ещё не оплачен.' }}
        <router-link v-if="order.payment.url" :to="order.payment.url" data-testid="order-pay-link">Оплатить</router-link>
      </p>
      </template>
      <!-- Place for the 54-FZ receipt (stage 11 does not issue receipts). -->
      <p class="receipt" data-testid="receipt-slot" hidden></p>
      <p v-if="order.tracking_url" data-testid="order-tracking">
        Отслеживание: <a :href="order.tracking_url" target="_blank" rel="noopener">{{ order.delivery_reference }}</a>
      </p>
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

  &__line {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 4px 0;
  }

  &__photo {
    width: 56px;
    height: 56px;
    flex-shrink: 0;
    object-fit: cover;
  }
}

.actions {
  margin-top: 25px;
}

.confirm {
  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  &__form {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin: 12px 0;

    input {
      flex: 1 1 240px;
      min-width: 0;
      padding: 8px;
      border: 1px solid #000;
    }
  }
}
</style>
