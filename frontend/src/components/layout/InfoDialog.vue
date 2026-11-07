<!--
/**
 * Pop-up over the current page for the footer documents (company details, privacy policy).
 * Closes with Esc, the cross and a click outside; the page behind does not scroll.
 * @component InfoDialog
 */
-->
<script setup lang="ts">
import { safeHtml } from '@/seo/sanitize'
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{ open: boolean; label: string; html: string }>()
const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement | null>(null)
let opener: HTMLElement | null = null

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

watch(() => props.open, async (open) => {
  if (typeof document === 'undefined') return
  if (open) {
    opener = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    await nextTick()
    panel.value?.focus()
  } else {
    document.body.style.overflow = ''
    document.removeEventListener('keydown', onKey)
    opener?.focus?.()
  }
})

onBeforeUnmount(() => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = ''
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="info-dialog" data-testid="info-dialog" @click.self="emit('close')">
      <div ref="panel" class="info-dialog__panel" role="dialog" aria-modal="true" :aria-label="label" tabindex="-1">
        <button type="button" class="info-dialog__close" aria-label="Закрыть" data-testid="info-dialog-close" @click="emit('close')">×</button>
        <div class="info-dialog__body" v-html="safeHtml(html)" />
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss">
.info-dialog {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30px 15px;
  background: rgba(0, 0, 0, 0.45);

  &__panel {
    position: relative;
    box-sizing: border-box;
    width: 100%;
    max-width: 700px;
    max-height: 100%;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    padding: 30px 30px 15px;
    background: #fff;
    outline: none;
  }

  &__close {
    position: sticky;
    float: right;
    top: 0;
    margin: -15px -15px 0 15px;
    padding: 0 8px;
    border: none;
    background: #fff;
    font: inherit;
    font-size: 28px;
    line-height: 32px;
    cursor: pointer;
  }

  &__body {
    p { margin-bottom: 19px; line-height: 19px; }
    a { text-decoration: underline; }
  }
}

@media (max-width: 660px) {
  .info-dialog {
    padding: 0;

    &__panel {
      max-width: none;
      height: 100%;
      padding: 15px 15px 5px;
    }

    &__body p { margin-bottom: 18px; line-height: 18px; }
  }
}
</style>
