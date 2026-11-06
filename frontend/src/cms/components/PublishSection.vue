<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { cmsApi, errorMessage, Publication } from '../api'
import { formatDate } from '../logic'

const list = ref<Publication[]>([])
const error = ref('')
const busy = ref(false)
const open = ref<number | null>(null)
let timer: ReturnType<typeof setInterval> | null = null

const STATE: Record<string, string> = { queued: 'в очереди', running: 'идёт сборка', done: 'готово', failed: 'ошибка' }
const running = computed(() => list.value.some((p) => p.state === 'queued' || p.state === 'running'))

async function load() {
  try {
    list.value = await cmsApi.publications(20)
  } catch (e) {
    error.value = errorMessage(e)
  }
}

async function publish() {
  if (!confirm('Запустить пересборку сайта?')) return
  busy.value = true
  error.value = ''
  try {
    await cmsApi.publish()
    await load()
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  load()
  timer = setInterval(() => { if (running.value) load() }, 3000)
})
onBeforeUnmount(() => { if (timer) clearInterval(timer) })
</script>

<template>
  <div class="cms-section">
    <header class="cms-toolbar">
      <h2 class="cms-title">Публикация</h2>
      <button class="cms-btn cms-btn--primary" :disabled="busy || running" @click="publish">
        {{ running ? 'Сборка идёт…' : 'Опубликовать' }}
      </button>
    </header>
    <p class="cms-muted">Публикация пересобирает сайт из текущих данных CMS. Журнал показывает последние запуски.</p>
    <p v-if="error" class="cms-error cms-error--box">{{ error }}</p>
    <table class="cms-table">
      <thead><tr><th>№</th><th>Состояние</th><th>Начало</th><th>Конец</th><th /></tr></thead>
      <tbody>
        <template v-for="p in list" :key="p.id">
          <tr>
            <td>{{ p.id }}</td>
            <td><span class="cms-badge" :class="`cms-badge--${p.state}`">{{ STATE[p.state] ?? p.state }}</span></td>
            <td>{{ formatDate(p.started_at) }}</td>
            <td>{{ formatDate(p.finished_at) }}</td>
            <td><button v-if="p.log" class="cms-link" @click="open = open === p.id ? null : p.id">Журнал</button></td>
          </tr>
          <tr v-if="open === p.id"><td colspan="5"><pre class="cms-log">{{ p.log }}</pre></td></tr>
        </template>
        <tr v-if="!list.length"><td colspan="5" class="cms-muted">Запусков ещё не было</td></tr>
      </tbody>
    </table>
  </div>
</template>
