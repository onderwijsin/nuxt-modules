<script lang="ts" setup>
import type { ConfirmDialogProps } from "../types";

withDefaults(defineProps<ConfirmDialogProps>(), {
  actions: () => [
    {
      label: "Annuleren",
      color: "neutral",
      variant: "soft",
      mode: "cancel"
    },
    {
      label: "Bevestigen",
      color: "primary",
      variant: "solid",
      mode: "confirm"
    }
  ]
});

const emit = defineEmits<{
  close: [value: boolean];
}>();
</script>

<template>
  <UModal
    :title="title"
    :description="description"
    :dismissible="false"
    :ui="{ footer: 'justify-end' }"
  >
    <template #footer>
      <UButton
        v-for="(action, index) in actions"
        :key="index"
        :label="action.label"
        :color="action.mode === 'confirm' ? (color ?? action.color) : action.color"
        :variant="action.variant"
        :autofocus="action.mode === 'confirm'"
        @click="emit('close', action.mode === 'confirm')"
      />
    </template>
  </UModal>
</template>
