<script setup lang="ts">
import { computed, onMounted } from 'vue'
import type { Row } from '../api'
import { formatDate, formatMoney, photoUrl, truncate } from '../logic'
import { loadRef, refHex, refLabel } from '../refs'
import { PAYMENT_STATES, type Column } from '../registry'

/** Table cell of a CMS list; formats the value by the column kind. */
defineOptions({ name: 'Cell' })

const props = defineProps<{
  /** Column definition. */
  column: Column
  /** Row to show. */
  row: Row
}>()
const value = computed(() => props.row[props.column.key])

onMounted(() => {
  if (props.column.ref) loadRef(props.column.ref, props.column.refLabel)
})

const text = computed(() => {
  const v = value.value
  switch (props.column.kind) {
    case 'bool': return v ? 'да' : 'нет'
    case 'money': return formatMoney(v)
    case 'date': return formatDate(v)
    case 'ref': return refLabel(props.column.ref!, v, props.column.refLabel)
    case 'badge': return PAYMENT_STATES.find((p) => p.value === v)?.label ?? String(v ?? '—')
    default:
      if (v && typeof v === 'object') return [v.name, v.phone, v.e_mail].filter(Boolean).join(', ') || '—'
      return v === null || v === undefined || v === '' ? '—' : truncate(String(v), 80)
  }
})
</script>

<template>
  <img v-if="column.kind === 'photo' && value" :src="photoUrl(value)!" alt="" class="cms-thumb" />
  <span v-else-if="column.kind === 'color'" class="cms-colorcell">
    <span class="cms-swatch" :style="{ background: '#' + ((column.ref ? refHex(column.ref, value) : value) || 'ffffff') }" />
    {{ column.ref ? refLabel(column.ref, value) : value }}
  </span>
  <span v-else-if="column.kind === 'badge'" class="cms-badge">{{ text }}</span>
  <span v-else>{{ text }}</span>
</template>
