<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { cmsApi, errorMessage, Row } from '../api'
import { sectionByKey, type Child } from '../registry'
import { invalidateRef } from '../refs'
import { movePriority } from '../logic'
import RecordForm from './RecordForm.vue'
import Cell from './Cell.vue'

/** Editable table of child rows shown inside a parent record form. */
defineOptions({ name: 'ChildTable' })

const props = defineProps<{
  /** Child table definition. */
  child: Child
  /** Id of the parent record. */
  parentId: number
}>()
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

async function move(i: number, delta: -1 | 1) {
  try {
    for (const p of movePriority(rows.value, i, delta)) await cmsApi.update(section.table!, p.id, { priority: p.priority })
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
        <tr v-for="(r, i) in rows" :key="r.id">
          <td v-for="c in section.columns" :key="c.key"><Cell :column="c" :row="r" /></td>
          <td class="cms-actions">
            <template v-if="section.sort === 'priority'">
              <button type="button" class="cms-link" title="Выше" aria-label="Выше" data-move="up" :disabled="i === 0" @click="move(i, -1)">↑</button>
              <button type="button" class="cms-link" title="Ниже" aria-label="Ниже" data-move="down" :disabled="i === rows.length - 1" @click="move(i, 1)">↓</button>
            </template>
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
