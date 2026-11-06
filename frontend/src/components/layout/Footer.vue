<script setup lang="ts">
import { getSetting } from '@/data/content'

defineOptions({ name: 'SiteFooter' })

const phone = getSetting('contact.phone')
const email = getSetting('contact.email')
</script>

<template>
  <footer class="footer">
    <div class="footer__col">
      <p>{{ getSetting('footer.credit') }}</p>
      <p v-if="phone"><a :href="getSetting('contact.whatsapp') || `tel:${phone.replace(/\s/g, '')}`">{{ phone }}</a></p>
      <p v-if="email"><a :href="`mailto:${email}`">{{ email }}</a></p>
      <p>{{ getSetting('contact.instagram') }}</p>
    </div>
    <div class="footer__col">
      <p><router-link to="/privacy#company">О компании</router-link></p>
      <p><router-link to="/privacy">Политика конфиденциальности</router-link></p>
    </div>
  </footer>
</template>

<style lang="scss" scoped>
.footer {
  display: flex;
  gap: 30px;
  margin-bottom: 30px;
  padding: 0 15px;

  &__col {
    width: 540px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
  }

  p, a {
    font-size: 14px;
    line-height: 19px;
  }
}

@media (max-width: 1160px) {
  .footer {
    flex-direction: column;
    gap: 15px;
    padding: 0 20px;

    &__col {
      width: auto;
    }
  }
}

@media (max-width: 660px) {
  .footer {
    margin-bottom: 15px;
    padding: 0 15px;

    p, a {
      font-size: 12px;
      line-height: 14px;
    }
  }
}
</style>
