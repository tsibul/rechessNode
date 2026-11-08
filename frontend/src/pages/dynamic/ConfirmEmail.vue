<!--
/**
 * Page of the link from the confirmation mail. It asks the server to confirm the order
 * (a mail scanner that only opens the link does not run the page, so it confirms nothing).
 * @component ConfirmEmail
 */
-->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import ShopPage from '@/components/layout/ShopPage.vue'
import { api } from '@/services/api'
import { getSetting } from '@/data/content'

/** Order e-mail confirmation page. */
defineOptions({ name: 'ConfirmEmail' })

const route = useRoute()
const state = ref<'loading' | 'confirmed' | 'invalid' | 'expired' | 'error'>('loading')
const doneTitle = getSetting('shop.confirm.done_title', 'Заказ подтверждён')
const doneText = getSetting('shop.confirm.done_text', 'Спасибо! Мы отправили письмо с номером заказа.')
const invalidTitle = getSetting('shop.confirm.invalid_title', 'Ссылка недействительна')
const invalidText = getSetting('shop.confirm.invalid_text', 'Ссылка устарела или уже использована.')
const expiredText = getSetting('shop.confirm.expired', 'Заказ отменён: адрес почты не был подтверждён в течение 24 часов. Оформите заказ заново.')

onMounted(async () => {
  try {
    const res = await api<{ status: 'confirmed' | 'invalid' | 'expired' }>('/orders/confirm', {
      method: 'POST', body: { token: String(route.params.token) }
    })
    state.value = res.status
  } catch {
    state.value = 'error'
  }
})
</script>

<template>
  <ShopPage title="Подтверждение заказа" path="/order">
    <p v-if="state === 'loading'">Подтверждаем заказ…</p>
    <div v-else-if="state === 'confirmed'" data-testid="confirm-ok">
      <h1>{{ doneTitle }}</h1>
      <p>{{ doneText }}</p>
      <p class="actions"><router-link to="/" class="btn">На главную</router-link></p>
    </div>
    <div v-else-if="state === 'expired'" data-testid="confirm-expired">
      <h1>Заказ отменён</h1>
      <p>{{ expiredText }}</p>
      <p><router-link to="/shop">В магазин</router-link></p>
    </div>
    <div v-else-if="state === 'invalid'" data-testid="confirm-invalid">
      <h1>{{ invalidTitle }}</h1>
      <p>{{ invalidText }}</p>
      <p><router-link to="/shop">В магазин</router-link></p>
    </div>
    <div v-else data-testid="confirm-error">
      <h1>Не удалось подтвердить заказ</h1>
      <p>Попробуйте открыть ссылку ещё раз.</p>
    </div>
  </ShopPage>
</template>

<style lang="scss" scoped>
.actions {
  margin-top: 25px;
}
</style>
