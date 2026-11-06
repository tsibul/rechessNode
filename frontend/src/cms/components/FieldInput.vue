<script setup lang="ts">
import { onMounted, useId } from 'vue'
import type { Field } from '../registry'
import { loadRef, refOptions } from '../refs'
import PhotoField from './PhotoField.vue'

const props = defineProps<{ field: Field; modelValue: any; error?: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: any): void }>()

onMounted(() => {
  if (props.field.ref) loadRef(props.field.ref, props.field.refLabel)
})

const set = (v: any) => emit('update:modelValue', v)
// The label is tied to its control (screen readers, click on the label focuses the field).
const id = `cms-f-${useId()}`
</script>

<template>
  <div class="cms-field" :class="{ 'cms-field--error': error }">
    <label v-if="field.type !== 'boolean'" class="cms-field__label" :for="field.type === 'photo' ? undefined : id">
      {{ field.label }}<span v-if="field.required" class="cms-field__req">*</span>
    </label>

    <textarea
      v-if="field.type === 'textarea'" :id="id" class="cms-input" rows="4"
      :value="modelValue ?? ''" @input="set(($event.target as HTMLTextAreaElement).value)"
    />
    <textarea
      v-else-if="field.type === 'json'" :id="id" class="cms-input cms-input--code" rows="10" spellcheck="false"
      :value="modelValue ?? ''" @input="set(($event.target as HTMLTextAreaElement).value)"
    />
    <select
      v-else-if="field.type === 'select'" :id="id" class="cms-input"
      :value="modelValue ?? ''" @change="set(($event.target as HTMLSelectElement).value === '' ? null : Number(($event.target as HTMLSelectElement).value))"
    >
      <option value="">—</option>
      <option v-for="o in refOptions(field.ref!, field.refLabel)" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>
    <select
      v-else-if="field.type === 'enum'" :id="id" class="cms-input"
      :value="modelValue ?? ''" @change="set(($event.target as HTMLSelectElement).value)"
    >
      <option v-for="o in field.options" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>
    <label v-else-if="field.type === 'boolean'" class="cms-check">
      <input type="checkbox" :checked="!!modelValue" @change="set(($event.target as HTMLInputElement).checked)" />
      {{ field.label }}
    </label>
    <PhotoField v-else-if="field.type === 'photo'" :model-value="modelValue || null" @update:model-value="set" />
    <div v-else-if="field.type === 'hex'" class="cms-hex">
      <span class="cms-swatch" :style="{ background: '#' + (modelValue || 'ffffff') }" />
      <input :id="id" class="cms-input" maxlength="6" :value="modelValue ?? ''" @input="set(($event.target as HTMLInputElement).value)" />
    </div>
    <input
      v-else :id="id" class="cms-input"
      :type="field.type === 'number' ? 'number' : field.type === 'password' ? 'password' : field.type === 'datetime' ? 'datetime-local' : 'text'"
      :autocomplete="field.type === 'password' ? 'new-password' : 'off'"
      :value="modelValue ?? ''"
      @input="set(field.type === 'number' ? (($event.target as HTMLInputElement).value === '' ? null : Number(($event.target as HTMLInputElement).value)) : ($event.target as HTMLInputElement).value)"
    />

    <p v-if="field.hint" class="cms-field__hint">{{ field.hint }}</p>
    <p v-if="error" class="cms-error">{{ error }}</p>
  </div>
</template>
