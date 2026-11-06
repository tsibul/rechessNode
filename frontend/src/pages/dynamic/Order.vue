<!--
/**
 * Checkout without an account: contacts, delivery, consent to personal data processing.
 * The form is prefilled with the visitor's last order. Prices and totals are the backend's.
 * @component Order
 */
-->
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import ShopPage from '@/components/layout/ShopPage.vue'
import { api, ApiError } from '@/services/api'
import { useCartStore } from '@/store/cart'

interface Prefill {
  name: string | null; family_name: string | null; city: string | null; phone: string | null; e_mail: string | null
  address_delivery: boolean; delivery_address: string | null; delivery_point_code: string | null
}

const router = useRouter()
const cart = useCartStore()
const rub = (n: number) => `${new Intl.NumberFormat('ru-RU').format(n)} ₽`

const form = reactive({
  name: '', family_name: '', city: '', phone: '', e_mail: '',
  address_delivery: true, delivery_address: '', delivery_point_code: '', comment: '', consent: false
})
const errors = reactive<Record<string, string>>({})
const formError = ref<string | null>(null)
const submitting = ref(false)

const FIELD_LABELS: Record<string, string> = {
  name: 'Укажите имя', phone: 'Проверьте номер телефона', e_mail: 'Проверьте адрес электронной почты',
  delivery_address: 'Укажите адрес', delivery_point_code: 'Укажите код пункта выдачи', consent: 'Нужно согласие на обработку данных'
}

onMounted(async () => {
  cart.load().catch(() => { formError.value = 'Не удалось загрузить корзину. Обновите страницу.' })
  try {
    const { contact } = await api<{ contact: Prefill | null }>('/checkout/prefill')
    if (contact) {
      form.name = contact.name ?? ''
      form.family_name = contact.family_name ?? ''
      form.city = contact.city ?? ''
      form.phone = contact.phone ?? ''
      form.e_mail = contact.e_mail ?? ''
      form.address_delivery = contact.address_delivery
      form.delivery_address = contact.delivery_address ?? ''
      form.delivery_point_code = contact.delivery_point_code ?? ''
    }
  } catch {
    // prefill is a convenience
  }
})

function validate(): boolean {
  for (const k of Object.keys(errors)) delete errors[k]
  if (!form.name.trim()) errors.name = FIELD_LABELS.name
  if (form.phone.replace(/\D/g, '').length < 10) errors.phone = FIELD_LABELS.phone
  if (!/^\S+@\S+\.\S+$/.test(form.e_mail.trim())) errors.e_mail = FIELD_LABELS.e_mail
  if (!form.delivery_address.trim()) errors.delivery_address = FIELD_LABELS.delivery_address
  if (!form.address_delivery && !form.delivery_point_code.trim()) errors.delivery_point_code = FIELD_LABELS.delivery_point_code
  if (!form.consent) errors.consent = FIELD_LABELS.consent
  return Object.keys(errors).length === 0
}

const canSubmit = computed(() => !submitting.value && !cart.isEmpty)

async function submit() {
  formError.value = null
  if (!validate()) return
  submitting.value = true
  try {
    const { order } = await api<{ order: { number: number } }>('/orders', {
      method: 'POST',
      body: {
        name: form.name, family_name: form.family_name || null, city: form.city || null,
        phone: form.phone, e_mail: form.e_mail,
        address_delivery: form.address_delivery, delivery_address: form.delivery_address,
        delivery_point_code: form.address_delivery ? null : form.delivery_point_code,
        comment: form.comment || null, consent: form.consent
      }
    })
    cart.reset()
    await router.push(`/order/${order.number}`)
  } catch (e) {
    const err = e as ApiError
    if (err.status === 400 && err.details.length) {
      for (const d of err.details) {
        const field = String(d.path[0] ?? '')
        if (field in FIELD_LABELS) errors[field] = FIELD_LABELS[field]
      }
      formError.value = 'Проверьте выделенные поля.'
    } else if (err.status === 400) {
      formError.value = 'Корзина пуста. Добавьте шахматы и повторите.'
      cart.load().catch(() => {})
    } else if (err.status === 429) {
      formError.value = 'Слишком много попыток. Подождите несколько минут и повторите.'
    } else {
      formError.value = 'Не удалось оформить заказ. Заказ не создан, повторите попытку.'
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <ShopPage title="Оформление заказа" path="/order">
    <h1>Оформление заказа</h1>

    <p v-if="cart.loaded && cart.isEmpty" data-testid="order-empty">
      В корзине пока ничего нет. <router-link to="/shop">Выбрать шахматы</router-link>
    </p>

    <form v-else novalidate data-testid="order-form" @submit.prevent="submit">
      <p v-if="formError" class="notice" role="alert" data-testid="form-error">{{ formError }}</p>

      <div v-if="cart.loaded" class="summary" data-testid="order-summary">
        <p v-for="line in cart.items" :key="line.item_id">{{ line.name }} × {{ line.quantity }} — {{ rub(line.sum) }}</p>
        <p class="summary__total">Итого: {{ rub(cart.total) }}. Стоимость доставки рассчитывается отдельно.</p>
      </div>

      <label class="field">Имя
        <input v-model="form.name" name="name" autocomplete="given-name" required>
        <span v-if="errors.name" class="field__error" role="alert">{{ errors.name }}</span>
      </label>
      <label class="field">Фамилия
        <input v-model="form.family_name" name="family_name" autocomplete="family-name">
      </label>
      <label class="field">Телефон
        <input v-model="form.phone" name="phone" type="tel" autocomplete="tel" placeholder="+7 999 000-00-00" required>
        <span v-if="errors.phone" class="field__error" role="alert">{{ errors.phone }}</span>
      </label>
      <label class="field">Электронная почта
        <input v-model="form.e_mail" name="e_mail" type="email" autocomplete="email" required>
        <span v-if="errors.e_mail" class="field__error" role="alert">{{ errors.e_mail }}</span>
      </label>
      <label class="field">Город
        <input v-model="form.city" name="city" autocomplete="address-level2">
      </label>

      <fieldset class="field">
        <legend>Доставка</legend>
        <label class="inline"><input v-model="form.address_delivery" type="radio" name="delivery" :value="true"> До двери</label>
        <label class="inline"><input v-model="form.address_delivery" type="radio" name="delivery" :value="false"> В пункт выдачи</label>
      </fieldset>
      <label class="field">{{ form.address_delivery ? 'Адрес доставки' : 'Адрес пункта выдачи' }}
        <input v-model="form.delivery_address" name="delivery_address" autocomplete="street-address" required>
        <span v-if="errors.delivery_address" class="field__error" role="alert">{{ errors.delivery_address }}</span>
      </label>
      <label v-if="!form.address_delivery" class="field">Код пункта выдачи
        <input v-model="form.delivery_point_code" name="delivery_point_code">
        <span v-if="errors.delivery_point_code" class="field__error" role="alert">{{ errors.delivery_point_code }}</span>
      </label>
      <label class="field">Комментарий
        <textarea v-model="form.comment" name="comment" rows="3" />
      </label>

      <label class="inline consent">
        <input v-model="form.consent" type="checkbox" name="consent">
        <span>Я согласен(на) на <router-link to="/personal-data" target="_blank">обработку персональных данных</router-link>
          и ознакомлен(а) с <router-link to="/privacy" target="_blank">политикой конфиденциальности</router-link></span>
      </label>
      <span v-if="errors.consent" class="field__error" role="alert">{{ errors.consent }}</span>

      <p class="actions"><button type="submit" class="btn" :disabled="!canSubmit" data-testid="submit">{{ submitting ? 'Отправляем…' : 'Оформить заказ' }}</button></p>
    </form>
  </ShopPage>
</template>

<style lang="scss" scoped>
@use '../../styles/vars' as *;

.summary {
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid $colorPrimary500;

  &__total {
    margin-top: 10px;
  }
}

.field {
  display: block;
  margin-bottom: 18px;
  border: none;

  input:not([type='radio']):not([type='checkbox']),
  textarea {
    display: block;
    width: 100%;
    margin-top: 6px;
    padding: 9px 10px;
    border: 1px solid $colorPrimary500;
    border-radius: 5px;
  }

  &__error {
    display: block;
    margin-top: 4px;
    color: #b00020;
    background: none;
  }
}

.inline {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 8px;
}

.consent {
  margin: 25px 0 5px;
}

.actions {
  margin-top: 25px;
}
</style>
