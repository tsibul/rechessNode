<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { cmsApi, errorMessage, Row } from '../api'
import { sectionByKey, type Child } from '../registry'
import { invalidateRef } from '../refs'
import RecordForm from './RecordForm.vue'
import Cell from './Cell.vue'

const props = defineProps<{ child: Child; parentId: number }>()
const section = sectionByKey(props.child.section)!
const rows = ref<Row[]>([])
const editing = ref<Row | null>(null)
const adding = ref(false)
const error = ref('')

async function load() {
  try {
    rows.value = (await cmsApi.list(section.table!, { [props.child.fk]: props.parentId, sort: section.sort, limit: 200 })).rows
  } catch (e) {
    error.value = errorMessage(e)
  }
}

async function remove(row: Row) {
  if (!confirm('Удалить запись?')) return
  try {
    await cmsApi.remove(section.table!, row.id)
    invalidateRef(section.table!)
    await load()
  } catch (e) {
    error.value = errorMessage(e)
  }
}

async function saved() {
  editing.value = null
  adding.value = false
  await load()
}

onMounted(load)
</script>

<template>
  <section class="cms-child">
    <header class="cms-child__head">
      <h3>{{ child.title }}</h3>
      <button type="button" class="cms-btn" @click="adding = true; editing = null">Добавить</button>
    </header>
    <p v-if="error" class="cms-error">{{ error }}</p>
    <table v-if="rows.length" class="cms-table cms-table--compact">
      <thead><tr><th v-for="c in section.columns" :key="c.key">{{ c.label }}</th><th /></tr></thead>
      <tbody>
        <tr v-for="r in rows" :key="r.id">
          <td v-for="c in section.columns" :key="c.key"><Cell :column="c" :row="r" /></td>
          <td class="cms-actions">
            <button type="button" class="cms-link" @click="editing = r; adding = false">Правка</button>
            <button type="button" class="cms-link cms-link--danger" @click="remove(r)">Удалить</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else class="cms-muted">Пока пусто</p>
    <div v-if="adding || editing" class="cms-child__form">
      <RecordForm
        :section="section" :row="editing" :fixed="{ [child.fk]: parentId }"
        @saved="saved" @cancel="editing = null; adding = false"
      />
    </div>
  </section>
</template>
