<!--
/**
 * Cookie banner. Text and button label come from the settings (CMS).
 * Shown only in the browser and only until the visitor presses the button.
 * @component CookieBanner
 */
-->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getSetting } from '@/data/content'

const COOKIE = 'cookieConsent'
const visible = ref(false)
const text = getSetting('cookie.banner.text', 'Этот сайт использует файлы cookie.')
const button = getSetting('cookie.banner.button', 'Ок')

onMounted(async () => {
  const Cookies = (await import('js-cookie')).default
  visible.value = Cookies.get(COOKIE) !== 'accepted'
})

async function accept() {
  const Cookies = (await import('js-cookie')).default
  Cookies.set(COOKIE, 'accepted', { expires: 365, path: '/', secure: location.protocol === 'https:', sameSite: 'Strict' })
  visible.value = false
}
</script>

<template>
  <div v-if="visible" class="cookie" role="dialog" aria-label="Cookie" data-testid="cookie-consent">
    <p class="cookie__text" v-html="text" />
    <button type="button" class="cookie__button" @click="accept">{{ button }}</button>
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
  .cookie {
    right: 15px;
    bottom: 90px;
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
