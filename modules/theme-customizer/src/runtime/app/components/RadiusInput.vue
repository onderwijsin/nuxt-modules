<script lang="ts" setup>
import { z } from "zod";
import { computed, shallowRef, watch } from "#imports";

const props = withDefaults(
  defineProps<{
    error?: string;
    placeholder?: string;
    size?: "xs" | "sm" | "md" | "lg" | "xl";
  }>(),
  {
    placeholder: "bijvoorbeeld 0,25",
    size: "md"
  }
);
const emit = defineEmits<{
  blur: [event: FocusEvent];
  keydownEnter: [event: KeyboardEvent];
}>();
const model = defineModel<string | undefined>();
const inputValue = shallowRef(model.value ?? "");
const validationError = shallowRef<string>();
const radiusSchema = z.string().regex(/^\d+(?:[,.]\d{1,3})?$/, {
  error: "Voer een niet-negatief getal met maximaal drie decimalen in."
});

const displayedError = computed(() => validationError.value ?? props.error);

watch(model, (value) => {
  const nextValue = value ?? "";
  if (nextValue !== inputValue.value) inputValue.value = nextValue;
});

/**
 * Validates the radius while preserving the raw value for parent-side application.
 * @param value Raw radius input value.
 * @returns Nothing; validation state is kept inside the input.
 */
function updateValue(value: string) {
  inputValue.value = value;
  model.value = value;
  const parsedValue = radiusSchema.safeParse(value.trim());
  validationError.value = parsedValue.success
    ? undefined
    : (parsedValue.error.issues[0]?.message ?? "Voer een geldige afronding in.");
}

/**
 * Revalidates on blur before forwarding the event to the consumer.
 * @param event Native blur event forwarded to the consumer.
 * @returns Nothing.
 */
function handleBlur(event: FocusEvent) {
  updateValue(inputValue.value);
  emit("blur", event);
}

/**
 * Revalidates on Enter before allowing the consumer to submit the value.
 * @param event Native keyboard event forwarded to the consumer.
 * @returns Nothing.
 */
function handleEnter(event: KeyboardEvent) {
  updateValue(inputValue.value);
  emit("keydownEnter", event);
}
</script>

<template>
  <UFormField :error="displayedError" :ui="{ label: 'hidden', root: 'mt-0!', container: 'mt-0' }">
    <UInput
      :model-value="inputValue"
      :placeholder="placeholder"
      :size="size"
      v-bind="$attrs"
      :ui="{ root: 'mt-0!' }"
      @update:model-value="updateValue"
      @blur="handleBlur"
      @keydown.enter="handleEnter"
    />
  </UFormField>
</template>
