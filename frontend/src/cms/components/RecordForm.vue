<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { cmsApi, errorMessage, Row } from '../api'
import { buildPayload, initialValues, validate, type FormValues } from '../logic'
import { invalidateRef } from '../refs'
import type { Section } from '../registry'
import FieldInput from './FieldInput.vue'

/** Create/edit form for a CMS record, built from the section fields. */
defineOptions({ name: 'RecordForm' })

const props = defineProps<{
  /** Section whose fields are edited. */
  section: Section
  /** Record to edit; empty to create. */
  row?: Row | null
  /** Field values that are set and hidden (parent link). */
  fixed?: Row
}>()
const emit = defineEmits<{
  /** Emitted with the saved row. */
  (e: 'saved', row: Row): void
  /** Emitted when editing is cancelled. */
  (e: 'cancel'): void
  /** Emitted with the form values when they change. */
  (e: 'values', v: FormValues): void
}>()

const fields = computed(() => (props.section.fields ?? []).filter((f) => !(props.fixed && f.key in props.fixed)))
const creating = computed(() => !props.row)
const values = reactive<FormValues>({})
const errors = ref<Record<string, string>>({})
const serverError = ref('')
const saving = ref(false)

watch(
  () => [props.row, props.section.key],
  () => {
    for (const k of Object.keys(values)) delete values[k]
    Object.assign(values, initialValues(fields.value, props.row))
    errors.value = {}
    serverError.value = ''
  },
  { immediate: true }
)
watch(values, () => emit('values', { ...values }), { deep: true, immediate: true })

async function save() {
  serverError.value = ''
  errors.value = validate(fields.value, values, creating.value)
  if (Object.keys(errors.value).length) return
  const body = { ...buildPayload(fields.value, values, creating.value), ...(creating.value ? props.fixed : {}) }
  saving.value = true
  try {
    const table = props.section.table!
    const saved = creating.value ? await cmsApi.create(table, body) : await cmsApi.update(table, props.row!.id, body)
    invalidateRef(table)
    emit('saved', saved)
  } catch (e) {
    serverError.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="cms-form" @submit.prevent="save">
    <FieldInput v-for="f in fields" :key="f.key" v-model="values[f.key]" :field="f" :error="errors[f.key]" />
    <p v-if="serverError" class="cms-error cms-error--box">{{ serverError }}</p>
    <div class="cms-form__actions">
      <button type="submit" class="cms-btn cms-btn--primary" :disabled="saving">{{ saving ? 'Сохранение…' : 'Сохранить' }}</button>
      <button type="button" class="cms-btn cms-btn--ghost" @click="emit('cancel')">Отмена</button>
    </div>
  </form>
</template>
