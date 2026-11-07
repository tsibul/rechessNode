<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { cmsApi, errorMessage, Row } from '../api'
import { groupSettings, settingFromInput, settingToInput } from '../logic'
import { SETTING_TYPES } from '../registry'
import PhotoField from './PhotoField.vue'
import RecordForm from './RecordForm.vue'

/** CMS section for editing site settings grouped by topic. */
defineOptions({ name: 'SettingsSection' })

const rows = ref<Row[]>([])
const values = reactive<Record<number, string | boolean>>({})
const saved = ref<Record<number, boolean>>({})
const errors = ref<Record<number, string>>({})
const error = ref('')
const adding = ref(false)

const groups = computed(() => groupSettings(rows.value))
const settingSection = {
  key: 'setting-new', title: 'Новая настройка', group: '', permission: 'settings' as const, kind: 'table' as const, table: 'setting',
  fields: [
    { key: 'code', label: 'Код', type: 'text' as const, required: true, hint: 'Латиница, цифры, точка, дефис: например counter.metrika' },
    { key: 'name', label: 'Название', type: 'text' as const, required: true },
    { key: 'type', label: 'Тип', type: 'enum' as const, options: SETTING_TYPES, required: true, default: 'text' },
    { key: 'group_name', label: 'Группа', type: 'text' as const },
    { key: 'priority', label: 'Порядок', type: 'number' as const, required: true, default: 10 },
    { key: 'value', label: 'Значение', type: 'textarea' as const }
  ]
}

async function load() {
  try {
    rows.value = (await cmsApi.list('setting', { limit: 200, sort: 'priority' })).rows
    for (const r of rows.value) values[r.id] = settingToInput(r.type, r.value)
  } catch (e) {
    error.value = errorMessage(e)
  }
}

async function save(row: Row) {
  errors.value[row.id] = ''
  try {
    await cmsApi.update('setting', row.id, { value: settingFromInput(row.type, values[row.id]) })
    saved.value[row.id] = true
    setTimeout(() => { saved.value[row.id] = false }, 1500)
  } catch (e) {
    errors.value[row.id] = errorMessage(e)
  }
}

async function remove(row: Row) {
  if (!confirm(`Удалить настройку ${row.code}?`)) return
  try {
    await cmsApi.remove('setting', row.id)
    await load()
  } catch (e) {
    error.value = errorMessage(e)
  }
}

async function created() {
  adding.value = false
  await load()
}

onMounted(load)
</script>

<template>
  <div class="cms-section">
    <header class="cms-toolbar">
      <h2 class="cms-title">Настройки</h2>
      <button class="cms-btn cms-btn--primary" @click="adding = !adding">{{ adding ? 'Скрыть' : 'Добавить' }}</button>
    </header>
    <p v-if="error" class="cms-error cms-error--box">{{ error }}</p>
    <div v-if="adding" class="cms-card">
      <RecordForm :section="settingSection" @saved="created" @cancel="adding = false" />
    </div>
    <section v-for="g in groups" :key="g.group" class="cms-card">
      <h3 class="cms-card__title">{{ g.group }}</h3>
      <div v-for="r in g.rows" :key="r.id" class="cms-setting">
        <div class="cms-setting__name">
          {{ r.name }}
          <code class="cms-setting__code">{{ r.code }}</code>
        </div>
        <div class="cms-setting__input">
          <label v-if="r.type === 'boolean'" class="cms-check">
            <input v-model="values[r.id]" type="checkbox" /> включено
          </label>
          <PhotoField v-else-if="r.type === 'photo'" v-model="values[r.id] as any" />
          <textarea v-else-if="r.type === 'html'" v-model="values[r.id] as string" class="cms-input" rows="5" />
          <input v-else v-model="values[r.id] as string" class="cms-input" :type="r.type === 'number' ? 'number' : 'text'" />
        </div>
        <div class="cms-setting__actions">
          <button class="cms-btn" @click="save(r)">{{ saved[r.id] ? 'Сохранено' : 'Сохранить' }}</button>
          <button class="cms-link cms-link--danger" @click="remove(r)">Удалить</button>
        </div>
        <p v-if="errors[r.id]" class="cms-error">{{ errors[r.id] }}</p>
      </div>
    </section>
  </div>
</template>
