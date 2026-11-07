<script setup lang="ts">
import { computed, ref } from 'vue'
import { getPage, getSetting } from '@/data/content'
import InfoDialog from '@/components/layout/InfoDialog.vue'

defineOptions({ name: 'SiteFooter' })

const phone = getSetting('contact.phone')
const email = getSetting('contact.email')

// "About the company" is its own text (setting company.about). The legal page keeps the legal details
// in its first column and the privacy policy in its third; the pop-up shows one of them.
type Doc = { label: string; column?: number }
const docs: Record<string, Doc> = {
  company: { label: 'О компании' },
  legal: { label: 'Юридическая информация', column: 0 },
  privacy: { label: 'Политика конфиденциальности', column: 2 }
}
const about = getSetting('company.about')
const current = ref<keyof typeof docs | null>(null)
const html = computed(() => {
  if (!current.value) return ''
  const doc = docs[current.value]
  if (doc.column === undefined) return about
  const block = getPage('privacy').blocks.find((b) => b.code === 'columns')
  return block && block.code === 'columns' ? (block.columns[doc.column] ?? '') : ''
})

/** Plain click opens the pop-up; new tab, new window and middle click keep the normal link to the page. */
function show(e: MouseEvent, doc: keyof typeof docs) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
  if (doc === 'company' ? !about : !getPage('privacy').blocks.length) return
  e.preventDefault()
  current.value = doc
}
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
      <p v-if="about"><a href="/about" data-testid="footer-company" @click="show($event, 'company')">О компании</a></p>
      <p><a href="/privacy#company" data-testid="footer-legal" @click="show($event, 'legal')">Юридическая информация</a></p>
      <p><a href="/privacy" data-testid="footer-privacy" @click="show($event, 'privacy')">Политика конфиденциальности</a></p>
    </div>
    <InfoDialog :open="!!current" :label="current ? docs[current].label : ''" :html="html" @close="current = null" />
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
