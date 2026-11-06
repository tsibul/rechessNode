<script setup lang="ts">
import type { Row } from '../api'
import { formatDate, formatMoney } from '../logic'
import { PAYMENT_STATES } from '../registry'

defineProps<{ kind: 'order' | 'cart' | 'client'; row: Row }>()
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
  </section>
</template>
