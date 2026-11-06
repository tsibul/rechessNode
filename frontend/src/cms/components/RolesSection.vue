<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { cmsApi, errorMessage, RoleWithPermissions } from '../api'
import { PERMISSIONS, PERMISSION_LABELS } from '../registry'
import RecordForm from './RecordForm.vue'
import { invalidateRef } from '../refs'

const roles = ref<RoleWithPermissions[]>([])
const error = ref('')
const message = ref('')
const adding = ref(false)
const roleSection = {
  key: 'role-new', title: 'Новая роль', group: '', permission: 'users' as const, kind: 'table' as const, table: 'role',
  fields: [
    { key: 'code', label: 'Код', type: 'text' as const, required: true, hint: 'Латиница, цифры, дефис' },
    { key: 'name', label: 'Название', type: 'text' as const, required: true }
  ]
}

async function load() {
  try {
    roles.value = await cmsApi.roles()
  } catch (e) {
    error.value = errorMessage(e)
  }
}

async function toggle(role: RoleWithPermissions, permission: string, on: boolean) {
  const next = on ? [...role.permissions, permission] : role.permissions.filter((p) => p !== permission)
  error.value = ''
  message.value = ''
  try {
    const saved = await cmsApi.setPermissions(role.id, next)
    role.permissions = saved.permissions
    message.value = `Права роли «${role.name}» сохранены`
  } catch (e) {
    error.value = errorMessage(e)
    await load()
  }
}

async function created() {
  adding.value = false
  invalidateRef('role')
  await load()
}

onMounted(load)
</script>

<template>
  <div class="cms-section">
    <header class="cms-toolbar">
      <h2 class="cms-title">Роли и права</h2>
      <button class="cms-btn cms-btn--primary" @click="adding = !adding">{{ adding ? 'Скрыть' : 'Добавить роль' }}</button>
    </header>
    <p v-if="error" class="cms-error cms-error--box">{{ error }}</p>
    <p v-if="message" class="cms-ok">{{ message }}</p>
    <div v-if="adding" class="cms-card"><RecordForm :section="roleSection" @saved="created" @cancel="adding = false" /></div>
    <div class="cms-tablewrap">
      <table class="cms-table cms-table--matrix">
        <thead>
          <tr><th>Право</th><th v-for="r in roles" :key="r.id">{{ r.name }}</th></tr>
        </thead>
        <tbody>
          <tr v-for="p in PERMISSIONS" :key="p">
            <td>{{ PERMISSION_LABELS[p] }} <code class="cms-setting__code">{{ p }}</code></td>
            <td v-for="r in roles" :key="r.id" class="cms-center">
              <input
                type="checkbox" :checked="r.permissions.includes(p)" :aria-label="`${r.name}: ${PERMISSION_LABELS[p]}`"
                @change="toggle(r, p, ($event.target as HTMLInputElement).checked)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="cms-muted">Права применяются сразу. У роли admin право «Пользователи и роли» снять нельзя.</p>
  </div>
</template>
