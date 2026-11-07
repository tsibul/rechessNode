<script setup lang="ts">
import { ref } from 'vue'
import { cmsApi, type Row } from '../api'
import { formatDate, formatMoney } from '../logic'
import { PAYMENT_STATES } from '../registry'

/** Read-only details of an order, cart or client with order actions. */
defineOptions({ name: 'Details' })

const props = defineProps<{
  /** What the row is: order, cart or client. */
  kind: 'order' | 'cart' | 'client'
  /** Row to show. */
  row: Row
}>()
const mail = ref<Row | null>(null)
const mailError = ref('')
const m = (k: string) => (mail.value ?? props.row)[k]
async function resend(kind: 'confirmation' | 'track' | 'manager') {
  mailError.value = ''
  try {
    mail.value = await cmsApi.sendOrderMail(props.row.id, kind)
  } catch {
    mailError.value = 'Не удалось отправить письмо'
  }
}
const sent = (at: unknown, err: unknown) => (err ? `ошибка: ${err}` : at ? formatDate(at as string) : 'не отправлялось')
const payment = (v: string) => PAYMENT_STATES.find((p) => p.value === v)?.label ?? v
</script>

<template>
  <section class="cms-details">
    <template v-if="kind === 'order'">
      <dl>
        <dt>Заказ</dt><dd>№ {{ row.number }} от {{ formatDate(row.date) }}, {{ row.state }}, {{ payment(row.payment_state) }}</dd>
        <dt>Покупатель</dt><dd>{{ row.name }} {{ row.family_name }}, {{ row.phone }}, {{ row.e_mail }}</dd>
        <dt>Доставка</dt>
        <dd>
          {{ row.address_delivery ? 'До двери' : `Пункт выдачи ${row.delivery_point_code ?? ''}` }}: {{ row.city }} {{ row.delivery_address }}
        </dd>
        <dt>Оплата</dt>
        <dd data-testid="order-payment">
          {{ payment(row.payment_state) }}<template v-if="row.payment_provider">, провайдер {{ row.payment_provider }}<template v-if="row.paid_at">, оплачен {{ formatDate(row.paid_at) }}</template></template>
          <template v-if="row.payment_provider === 'stub'"> (заглушка, деньги не списывались)</template>
        </dd>
        <dt>Чек 54-ФЗ</dt><dd data-testid="order-receipt">не формируется (будет после подключения платёжного сервиса)</dd>
        <dt>Стоимость</dt><dd>доставка {{ formatMoney(row.delivery_cost ?? 0) }}, вес {{ row.weight_g ?? 0 }} г</dd>
        <dt>Трек</dt><dd>{{ row.delivery_reference || '—' }}</dd>
        <dt>Письмо заказа</dt>
        <dd>
          {{ sent(m('confirmation_sent_at'), m('confirmation_error')) }}
          <button type="button" class="cms-btn" @click="resend('confirmation')">Отправить ещё раз</button>
        </dd>
        <dt>Письмо с треком</dt>
        <dd>
          {{ sent(m('track_sent_at'), m('track_error')) }}
          <button v-if="row.delivery_reference" type="button" class="cms-btn" @click="resend('track')">Отправить ещё раз</button>
        </dd>
        <dt>Письмо менеджерам</dt>
        <dd data-testid="order-manager-mail">
          {{ sent(m('manager_sent_at'), m('manager_error')) }}
          <button type="button" class="cms-btn" @click="resend('manager')">Отправить ещё раз</button>
        </dd>
        <dt v-if="mailError">Ошибка</dt><dd v-if="mailError">{{ mailError }}</dd>
        <dt>Согласие</dt><dd>{{ row.consent_at ? formatDate(row.consent_at) : '—' }}</dd>
      </dl>
      <table class="cms-table cms-table--compact">
        <thead><tr><th>Позиция</th><th>Артикул</th><th>Кол-во</th><th>Цена</th></tr></thead>
        <tbody>
          <tr v-for="i in row.items" :key="i.item_id">
            <td>{{ i.name }}</td><td>{{ i.article }}</td><td>{{ i.quantity }}</td><td>{{ formatMoney(i.price) }}</td>
          </tr>
        </tbody>
        <tfoot><tr><td colspan="3">Итого</td><td>{{ formatMoney(row.sum) }}</td></tr></tfoot>
      </table>
    </template>
    <template v-else-if="kind === 'cart'">
      <dl>
        <dt>Клиент</dt><dd>{{ row.client ? `${row.client.name ?? ''} ${row.client.phone ?? ''} ${row.client.e_mail ?? ''}` : '—' }}</dd>
        <dt>Изменена</dt><dd>{{ formatDate(row.last_updated) }}</dd>
        <dt>Оформлена</dt><dd>{{ row.ordered ? formatDate(row.ordered) : 'нет' }}</dd>
      </dl>
      <table class="cms-table cms-table--compact">
        <thead><tr><th>Позиция</th><th>Кол-во</th></tr></thead>
        <tbody><tr v-for="i in row.items" :key="i.item_id"><td>{{ i.name }}</td><td>{{ i.quantity }}</td></tr></tbody>
      </table>
    </template>
    <template v-else-if="kind === 'client'">
      <p data-testid="client-summary">
        Заказов: {{ row.orders?.length ?? 0 }}, на сумму {{ formatMoney(row.orders_sum ?? 0) }}; неоформленных корзин: {{ row.open_carts ?? 0 }}
      </p>
      <table v-if="row.orders?.length" class="cms-table cms-table--compact" data-testid="client-orders">
        <thead><tr><th>№</th><th>Дата</th><th>Сумма</th><th>Статус</th><th>Оплата</th></tr></thead>
        <tbody>
          <tr v-for="o in row.orders" :key="o.id">
            <td>{{ o.number }}</td><td>{{ formatDate(o.date) }}</td><td>{{ formatMoney(o.sum) }}</td><td>{{ o.state }}</td><td>{{ payment(o.payment_state) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else>Заказов нет</p>
    </template>
  </section>
</template>
