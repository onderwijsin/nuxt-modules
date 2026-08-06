<script lang="ts" setup>
import { shallowRef } from "#imports";
import type { FormModalProps } from "../types";

const props = withDefaults(defineProps<FormModalProps>(), {
  placeholder: "Voer een naam in",
  submitLabel: "Opslaan"
});

const emit = defineEmits<{
  close: [value: string | undefined];
}>();

const value = shallowRef(props.initialValue);
const error = shallowRef<string>();

/** Validates and submits the current form value to the overlay caller. */
function submit() {
  const trimmedValue = value.value.trim();
  error.value = props.validate?.(trimmedValue);
  if (error.value) return;

  emit("close", trimmedValue);
}
</script>

<template>
  <UModal :title="title" :dismissible="false" :ui="{ footer: 'justify-end' }">
    <template #body>
      <UFormField :label="label" :error="error">
        <UInput
          v-model="value"
          autofocus
          class="w-full"
          :placeholder="placeholder"
          @keydown.enter.prevent="submit"
        />
      </UFormField>
    </template>
    <template #footer>
      <UButton label="Annuleren" color="neutral" variant="soft" @click="emit('close', undefined)" />
      <UButton :label="submitLabel" color="primary" autofocus @click="submit" />
    </template>
  </UModal>
</template>
