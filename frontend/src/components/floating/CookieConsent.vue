<!--
/**
 * Cookie consent banner component.
 * @component CookieConsent
 */
-->
<script setup lang="ts">
import { ref, onMounted } from 'vue'

const isVisible = ref(false)

const checkCookies = async () => {
  const Cookies = (await import('js-cookie')).default
  const consent = Cookies.get('cookieConsent')
  if (consent !== 'accepted' && consent !== 'rejected') {
    isVisible.value = true
  }
}

onMounted(checkCookies)

async function acceptCookies() {
  const Cookies = (await import('js-cookie')).default
  Cookies.set('cookieConsent', 'accepted', { 
    expires: 365,
    path: '/',
    secure: true,
    sameSite: 'Strict'
  })
  isVisible.value = false
}

async function rejectCookies() {
  const Cookies = (await import('js-cookie')).default
  Cookies.set('cookieConsent', 'rejected', { 
    expires: 7,
    path: '/',
    secure: true,
    sameSite: 'Strict'
  })
  isVisible.value = false
}
</script>

<template>
  <div 
    v-if="isVisible" 
    class="cookie-consent"
    data-testid="cookie-consent"
  >
    <p class="cookie-text">
      We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.
    </p>
    <div class="cookie-buttons">
      <button 
        @click="acceptCookies"
        class="accept-button"
      >
        Accept
      </button>
      <button 
        @click="rejectCookies"
        class="reject-button"
      >
        Reject
      </button>
    </div>
  </div>
</template>

<style scoped>
.cookie-consent {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #1a202c;
  color: white;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 50;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
}

.cookie-text {
  margin: 0;
  padding-right: 1rem;
}

.cookie-buttons {
  display: flex;
  gap: 0.5rem;
}

.accept-button,
.reject-button {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.accept-button {
  background-color: #48bb78;
  color: white;
  border: none;
}

.accept-button:hover {
  background-color: #38a169;
}

.reject-button {
  background-color: transparent;
  color: white;
  border: 1px solid white;
}

.reject-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

@media (max-width: 640px) {
  .cookie-consent {
    flex-direction: column;
    text-align: center;
  }

  .cookie-text {
    padding-right: 0;
    margin-bottom: 1rem;
  }
}
</style> 