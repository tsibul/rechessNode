<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useCmsStore } from '../../store/cms'
import { groupSections } from '../registry'
import LoginForm from './LoginForm.vue'
import PublishSection from './PublishSection.vue'
import RolesSection from './RolesSection.vue'
import SettingsSection from './SettingsSection.vue'
import TableSection from './TableSection.vue'

const store = useCmsStore()
const hash = ref('')
const groups = computed(() => groupSections(store.sections))
const sectionKey = computed(() => hash.value.split('/')[0])
/** `#orders/15`: opens the card of record 15 (the link in the manager mail). */
const openId = computed(() => Number(hash.value.split('/')[1]) || null)
const current = computed(() => store.sections.find((s) => s.key === sectionKey.value) ?? store.sections[0] ?? null)

function syncHash() {
  hash.value = window.location.hash.replace(/^#/, '')
}

onMounted(async () => {
  syncHash()
  window.addEventListener('hashchange', syncHash)
  await store.restore()
})
onBeforeUnmount(() => window.removeEventListener('hashchange', syncHash))
</script>

<template>
  <div class="cms">
    <p v-if="!store.checked" class="cms-muted cms-center-text">Загрузка…</p>
    <div v-else-if="!store.user" class="cms-login-wrap"><LoginForm /></div>
    <div v-else class="cms-shell">
      <aside class="cms-nav">
        <div class="cms-nav__user">
          <strong>{{ store.user.name }}</strong>
          <span class="cms-muted">{{ store.user.role.name }}</span>
        </div>
        <nav>
          <div v-for="g in groups" :key="g.group" class="cms-nav__group">
            <div class="cms-nav__title">{{ g.group }}</div>
            <a
              v-for="s in g.sections" :key="s.key" :href="`#${s.key}`" class="cms-nav__link"
              :class="{ 'cms-nav__link--active': current?.key === s.key }"
            >{{ s.title }}</a>
          </div>
        </nav>
        <div class="cms-nav__foot">
          <a href="/">На сайт</a>
          <button class="cms-link" @click="store.logout()">Выйти</button>
        </div>
      </aside>
      <main class="cms-main">
        <p v-if="!current" class="cms-muted">Для вашей роли нет доступных разделов.</p>
        <SettingsSection v-else-if="current.kind === 'settings'" :key="current.key" />
        <RolesSection v-else-if="current.kind === 'roles'" :key="current.key" />
        <PublishSection v-else-if="current.kind === 'publish'" :key="current.key" />
        <TableSection v-else :key="current.key" :section="current" :open-id="openId" />
      </main>
    </div>
  </div>
</template>
