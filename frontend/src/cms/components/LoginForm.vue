<script setup lang="ts">
import { ref } from 'vue'
import { useCmsStore } from '../../store/cms'

/** CMS sign-in form. */
defineOptions({ name: 'LoginForm' })

const store = useCmsStore()
const login = ref('')
const password = ref('')
const busy = ref(false)

async function submit() {
  busy.value = true
  await store.login(login.value.trim(), password.value)
  password.value = ''
  busy.value = false
}
</script>

<template>
  <form class="cms-login" @submit.prevent="submit">
    <h1 class="cms-login__title">reChess · CMS</h1>
    <label class="cms-field__label" for="cms-login">Логин</label>
    <input id="cms-login" v-model="login" class="cms-input" autocomplete="username" required />
    <label class="cms-field__label" for="cms-password">Пароль</label>
    <input id="cms-password" v-model="password" class="cms-input" type="password" autocomplete="current-password" required />
    <p v-if="store.error" class="cms-error cms-error--box">{{ store.error }}</p>
    <button type="submit" class="cms-btn cms-btn--primary" :disabled="busy">{{ busy ? 'Вход…' : 'Войти' }}</button>
  </form>
</template>
