<!--
/**
 * Cookie consent banner component.
 * @component CookieConsent
 */
-->
<script setup lang="ts">
import {ref, onMounted} from 'vue'

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

// async function rejectCookies() {
//   const Cookies = (await import('js-cookie')).default
//   Cookies.set('cookieConsent', 'rejected', {
//     expires: 7,
//     path: '/',
//     secure: true,
//     sameSite: 'Strict'
//   })
//   isVisible.value = false
// }
</script>

<template>
  <div
      v-if="isVisible"
      class="cookie-consent"
      data-testid="cookie-consent"
  >
    <div class="cookie-consent__content">
    <p class="cookie-consent__text">
      Мы используем cookies для улучшения работы сайта и сохранения ваших предпочтений
    </p>
    <div class="cookie-consent__buttons">
      <button
          @click="acceptCookies"
          class="accept-button"
      >
        Ок
      </button>
      <!--      <button-->
      <!--        @click="rejectCookies"-->
      <!--        class="reject-button"-->
      <!--      >-->
      <!--        Reject-->
      <!--      </button>-->
    </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '../../styles/vars' as *;


.cookie-consent {
  position: fixed;
  bottom: 15px;
  width: 100%;
  //display: flex;
  //justify-content: center;
  align-items: center;
  background-color: transparent;
  padding: 1rem;
  z-index: 1000;

  &__content {
    background-color: transparent;
    margin: 0 auto;
    display: flex;
    justify-content: center;
    gap: 15px;
    align-items: center;
  }

  &__text {
    background-color: transparent;
    gap: 1rem;
    font-size: 14px;
    line-height: 19px;

  }
}


.accept-button,
.reject-button {
  font-size: 14px;
  line-height: 19px;
  padding: 0.2rem 0.5rem;
  background: $colorPrimary500;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: $colorPrimary900;
  }
}


.cookie-buttons {
  display: flex;
  gap: 0.5rem;
}

@media (max-width: 640px) {
  .cookie-consent {
    flex-direction: column;
    text-align: center;


    &__text {
      padding-right: 0;
      margin-bottom: 1rem;
    }
  }
}
</style>
