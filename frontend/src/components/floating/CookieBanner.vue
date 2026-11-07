<!--
/**
 * Cookie banner. Text and button label come from the settings (CMS).
 * Shown only in the browser and only until the visitor presses the button.
 * @component CookieBanner
 */
-->
<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { getSetting } from '@/data/content'
import { acceptCookies, bannerMode, closeBanner, declineCookies, initConsent } from '@/services/consent'

const TEXT = {
  ask: getSetting('cookie.banner.text', 'Этот сайт использует файлы cookie. Подробнее — в <a href="/privacy#cookie">политике использования файлов cookie</a>.'),
  declined: 'Вы отказались от файлов cookie. Аналитика (Яндекс Метрика, VK) не загружается. Без cookie нельзя оформить заказ: при оформлении мы предложим принять их ещё раз.',
  order: 'Для оформления заказа нужны файлы cookie: они связывают вас с вашей корзиной. Принять и продолжить? Подробнее — в <a href="/privacy#cookie">политике использования файлов cookie</a>.'
}
const accept = getSetting('cookie.banner.button', 'Принять')
const decline = getSetting('cookie.banner.decline', 'Отклонить')

const text = computed(() => (bannerMode.value ? TEXT[bannerMode.value] : ''))

onMounted(initConsent)
</script>

<template>
  <div v-if="bannerMode" class="cookie" role="dialog" aria-label="Cookie" data-testid="cookie-consent" :data-mode="bannerMode">
    <p class="cookie__text" v-html="text" />
    <div class="cookie__buttons">
      <button v-if="bannerMode === 'ask'" type="button" class="cookie__button cookie__button--plain" data-testid="cookie-decline" @click="declineCookies">{{ decline }}</button>
      <button v-if="bannerMode === 'order'" type="button" class="cookie__button cookie__button--plain" data-testid="cookie-cancel" @click="closeBanner">Отмена</button>
      <button v-if="bannerMode === 'declined'" type="button" class="cookie__button cookie__button--plain" data-testid="cookie-close" @click="closeBanner">Понятно</button>
      <button type="button" class="cookie__button" data-testid="cookie-accept" @click="acceptCookies">{{ accept }}</button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '../../styles/vars' as *;
@use '../../styles/mixins' as *;

.cookie {
  position: fixed;
  left: 15px;
  right: 90px;
  bottom: 30px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  border-radius: 10px;
  background-color: #fff;
  box-shadow: 0 0 0 1px $colorPrimary500;

  &__text,
  &__text :deep(*) {
    font-size: 14px;
    line-height: 19px;
  }

  &__text :deep(a) {
    text-decoration: underline;
  }

  &__buttons {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  &__button--plain {
    background: transparent;
    box-shadow: inset 0 0 0 1px $colorPrimary500;
  }

  &__button {
    @include flex-center;
    flex-shrink: 0;
    min-width: 43px;
    height: 30px;
    padding: 0 12px;
    border: none;
    border-radius: 5px;
    background: $colorPrimary500;
    color: $colorPrimary900;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: $colorPrimary900;
      color: #fff;
    }
  }
}

@media (max-width: 660px) {
  // On a phone the banner stays on the bottom line next to the cart icon
  // (right: 90px leaves it free) and shrinks, so it covers less of the page.
  .cookie {
    left: 15px;
    right: 90px;
    bottom: 30px;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 10px;

    &__text,
    &__text :deep(*) {
      font-size: 12px;
      line-height: 15px;
    }

    // The button goes under the text: the text gets the whole width, the banner is lower.
    &__buttons { align-self: flex-end; }
  }
}
</style>
