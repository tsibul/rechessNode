<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { cmsApi, errorMessage, ListParams, Row } from '../api'
import { invalidateRef, loadRef, refOptions } from '../refs'
import { movePriority, type FormValues } from '../logic'
import type { Section } from '../registry'
import Cell from './Cell.vue'
import ChildTable from './ChildTable.vue'
import Details from './Details.vue'
import RecordForm from './RecordForm.vue'
import SeoPreview from './SeoPreview.vue'

/** CMS section with a searchable, sortable, paged list and a record form. */
defineOptions({ name: 'TableSection' })

const props = defineProps<{
  /** Section definition. */
  section: Section
  /** Id of the record to open at once. */
  openId?: number | null
}>()

const rows = ref<Row[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref('')
const page = ref(1)
const limit = 25
const q = ref('')
const deleted = ref<'0' | '1' | 'all'>('0')
const sort = ref(props.section.sort ?? 'id')
const dir = ref<'asc' | 'desc'>(props.section.dir ?? 'asc')
const filterValues = reactive<FormValues>({})
const selected = ref<Row | null>(null)
const creating = ref(false)
const formValues = ref<FormValues>({})
const pageSlugs = ref<Record<number, string>>({})

const isOrders = computed(() => props.section.table === 'order')
const stateCounts = ref<{ total: number; states: Array<{ id: number; name: string; count: number }> }>({ total: 0, states: [] })
async function loadCounts() {
  if (!isOrders.value) return
  try { stateCounts.value = (await cmsApi.orderStateCounts()) ?? stateCounts.value } catch { /* the list works without the counters */ }
}
function pickState(id: number | '') {
  filterValues.order_state_id = id === '' ? '' : String(id)
  resetAndLoad()
}

const ops = computed(() => props.section.ops ?? {})
const pages = computed(() => Math.max(1, Math.ceil(total.value / limit)))
const hasDeleted = computed(() => props.section.table !== 'order')
const editing = computed(() => creating.value || selected.value !== null)
const canEditForm = computed(() => (creating.value ? ops.value.create : ops.value.update) && (props.section.fields?.length ?? 0) > 0)

function params(): ListParams {
  const p: ListParams = { page: page.value, limit, sort: sort.value, dir: dir.value, q: q.value || undefined }
  if (hasDeleted.value) p.deleted = deleted.value
  for (const f of props.section.filters ?? []) {
    const v = filterValues[f.key]
    if (f.type === 'select' && v) p[f.key] = v
    if (f.type === 'checkbox' && v) Object.assign(p, f.params)
  }
  return p
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const r = await cmsApi.list(props.section.table!, params())
    rows.value = r.rows
    total.value = r.total
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
  loadCounts()
}

function resetAndLoad() {
  page.value = 1
  load()
}

function sortBy(key: string) {
  if (sort.value === key) dir.value = dir.value === 'asc' ? 'desc' : 'asc'
  else { sort.value = key; dir.value = 'asc' }
  resetAndLoad()
}

function open(row: Row) {
  creating.value = false
  selected.value = row
}

function close() {
  creating.value = false
  selected.value = null
}

async function saved(row: Row) {
  invalidateRef(props.section.table!)
  if (creating.value) { creating.value = false; selected.value = row } else selected.value = row
  await load()
}

const canReorder = computed(() => props.section.sort === 'priority' && sort.value === 'priority' && dir.value === 'asc' && !q.value && !!props.section.ops?.update)

async function move(i: number, delta: -1 | 1) {
  try {
    for (const p of movePriority(rows.value, i, delta)) await cmsApi.update(props.section.table!, p.id, { priority: p.priority })
    await load()
  } catch (e) {
    error.value = errorMessage(e)
  }
}

async function remove(row: Row) {
  if (!confirm('Удалить запись?')) return
  try {
    await cmsApi.remove(props.section.table!, row.id)
    invalidateRef(props.section.table!)
    close()
    await load()
  } catch (e) {
    error.value = errorMessage(e)
  }
}

async function restore(row: Row) {
  try {
    await cmsApi.restore(props.section.table!, row.id)
    invalidateRef(props.section.table!)
    await load()
  } catch (e) {
    error.value = errorMessage(e)
  }
}

async function loadPageSlugs() {
  if (props.section.preview !== 'seo') return
  try {
    const r = await cmsApi.list('page', { limit: 200 })
    pageSlugs.value = Object.fromEntries(r.rows.map((p) => [p.id, p.slug]))
  } catch {
    pageSlugs.value = {}
  }
}

onMounted(() => {
  for (const f of props.section.filters ?? []) if (f.ref) loadRef(f.ref)
  loadPageSlugs()
  load()
  openCard()
})
function openCard() {
  if (props.openId) cmsApi.get(props.section.table!, props.openId).then((r) => { selected.value = r }).catch(() => { error.value = 'Запись не найдена' })
}
watch(() => props.openId, openCard)
watch([q, deleted], resetAndLoad)
</script>

<template>
  <div class="cms-section">
    <header class="cms-toolbar">
      <h2 class="cms-title">{{ section.title }}</h2>
      <input v-if="section.search" v-model.trim="q" class="cms-input cms-toolbar__search" placeholder="Поиск" />
      <label v-for="f in section.filters" :key="f.key" class="cms-toolbar__filter">
        <template v-if="f.type === 'select'">
          {{ f.label }}
          <select v-model="filterValues[f.key]" class="cms-input" @change="resetAndLoad">
            <option value="">все</option>
            <option v-for="o in refOptions(f.ref!)" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </template>
        <template v-else>
          <input v-model="filterValues[f.key]" type="checkbox" @change="resetAndLoad" /> {{ f.label }}
        </template>
      </label>
      <select v-if="hasDeleted" v-model="deleted" class="cms-input cms-toolbar__deleted">
        <option value="0">Активные</option>
        <option value="1">Удалённые</option>
        <option value="all">Все</option>
      </select>
      <button v-if="ops.create" class="cms-btn cms-btn--primary" @click="creating = true; selected = null">Добавить</button>
    </header>

    <div v-if="isOrders" class="cms-chips" data-testid="state-chips">
      <button
        type="button" class="cms-chip" :class="{ 'cms-chip--active': !filterValues.order_state_id }"
        data-testid="state-chip-all" @click="pickState('')"
      >Все <b>{{ stateCounts.total }}</b></button>
      <button
        v-for="s in stateCounts.states" :key="s.id" type="button" class="cms-chip"
        :class="{ 'cms-chip--active': String(filterValues.order_state_id) === String(s.id) }"
        :data-testid="`state-chip-${s.id}`" @click="pickState(s.id)"
      >{{ s.name }} <b>{{ s.count }}</b></button>
    </div>

    <p v-if="error" class="cms-error cms-error--box">{{ error }}</p>

    <div class="cms-tablewrap">
      <table class="cms-table">
        <thead>
          <tr>
            <th v-for="c in section.columns" :key="c.key" :class="{ 'cms-sortable': c.sortable }" @click="c.sortable && sortBy(c.key)">
              {{ c.label }}<span v-if="sort === c.key">{{ dir === 'asc' ? ' ↑' : ' ↓' }}</span>
            </th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in rows" :key="r.id" :class="{ 'cms-row--deleted': r.deleted }" @click="open(r)">
            <td v-for="c in section.columns" :key="c.key"><Cell :column="c" :row="r" /></td>
            <td class="cms-actions" @click.stop>
              <template v-if="canReorder && !r.deleted">
                <button class="cms-link" title="Выше" aria-label="Выше" data-move="up" :disabled="i === 0" @click="move(i, -1)">↑</button>
                <button class="cms-link" title="Ниже" aria-label="Ниже" data-move="down" :disabled="i === rows.length - 1" @click="move(i, 1)">↓</button>
              </template>
              <button v-if="r.deleted && ops.remove" class="cms-link" @click="restore(r)">Восстановить</button>
              <button v-else-if="ops.remove" class="cms-link cms-link--danger" @click="remove(r)">Удалить</button>
            </td>
          </tr>
          <tr v-if="!rows.length && !loading"><td :colspan="(section.columns?.length ?? 0) + 1" class="cms-muted">Ничего нет</td></tr>
        </tbody>
      </table>
    </div>

    <footer class="cms-pager">
      <button class="cms-btn cms-btn--ghost" :disabled="page <= 1" @click="page--; load()">←</button>
      <span>{{ page }} / {{ pages }} · всего {{ total }}</span>
      <button class="cms-btn cms-btn--ghost" :disabled="page >= pages" @click="page++; load()">→</button>
    </footer>

    <div v-if="editing" class="cms-modal" @click.self="close">
      <div class="cms-modal__box" role="dialog" aria-modal="true">
        <header class="cms-modal__head">
          <h3>{{ creating ? 'Новая запись' : section.title }}</h3>
          <button class="cms-link" @click="close">Закрыть</button>
        </header>
        <Details v-if="section.details && selected" :kind="section.details" :row="selected" />
        <RecordForm
          v-if="canEditForm"
          :section="section" :row="creating ? null : selected"
          @saved="saved" @cancel="close" @values="formValues = $event"
        />
        <SeoPreview v-if="section.preview === 'seo'" :values="formValues" :page-slugs="pageSlugs" />
        <template v-if="selected && !creating">
          <ChildTable v-for="c in section.children" :key="c.section + selected.id" :child="c" :parent-id="selected.id" />
        </template>
        <p v-else-if="creating && section.children?.length" class="cms-muted">Вложенные списки доступны после сохранения.</p>
      </div>
    </div>
  </div>
</template>
