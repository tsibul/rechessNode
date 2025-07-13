<template>
  <div v-if="!cookiesAccepted" class="cookie-consent">
    <div class="cookie-content">
      <p>Мы используем cookies для улучшения работы сайта и сохранения ваших предпочтений.</p>
      <button @click="acceptCookies" class="accept-button">Принять</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/store/auth'

const authStore = useAuthStore()
const { cookiesAccepted } = storeToRefs(authStore)
const { acceptCookies } = authStore
</script>

<style scoped lang="scss">
.cookie-consent {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 1rem;
  z-index: 1000;
}

.cookie-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;

  p {
    margin: 0;
  }
}

.accept-button {
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #0056b3;
  }
}
</style> 