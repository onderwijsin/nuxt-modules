<script lang="ts" setup>
import { computed, shallowRef, watch } from "#imports";
import { hexColorSchema } from "../utils/theme";

const props = withDefaults(
  defineProps<{
    error?: string;
    allowEmpty?: boolean;
    placeholder?: string;
    size?: "xs" | "sm" | "md" | "lg" | "xl";
  }>(),
  {
    allowEmpty: false,
    placeholder: "#DBE1FF",
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
const displayedError = computed(() => validationError.value ?? props.error);

watch(model, (value) => {
  const nextValue = value ?? "";
  if (nextValue !== inputValue.value) inputValue.value = nextValue;
});

/**
 * Validates the input and updates the shared value only for valid hex colors.
 * @param value Raw input value from the text field.
 * @returns Nothing; invalid values remain local and do not update the shared model.
 */
function updateValue(value: string) {
  const trimmedValue = value.trim();

  if (props.allowEmpty && !trimmedValue) {
    validationError.value = undefined;
    inputValue.value = "";
    model.value = undefined;
    return;
  }

  const normalizedValue = trimmedValue.startsWith("#") ? trimmedValue : `#${trimmedValue}`;
  inputValue.value = normalizedValue;

  const parsedValue = hexColorSchema.safeParse(normalizedValue);
  if (!parsedValue.success) {
    validationError.value = parsedValue.error.issues[0]?.message;
    return;
  }

  validationError.value = undefined;
  model.value = parsedValue.data.toLowerCase();
}

/**
 * Revalidates on blur so whitespace and externally supplied values are handled consistently.
 * @param event Native blur event forwarded to the consumer.
 * @returns Nothing.
 */
function handleBlur(event: FocusEvent) {
  updateValue(inputValue.value);
  emit("blur", event);
}

/**
 * Forwards Enter so consumers can submit the validated value without reaching into the input.
 * @param event Native keyboard event forwarded to the consumer.
 * @returns Nothing.
 */
function handleEnter(event: KeyboardEvent) {
  emit("keydownEnter", event);
}
</script>

<template>
  <UFormField :error="displayedError" :ui="{ label: 'hidden', root: 'mt-0!', container: 'mt-0' }">
    <UInput
      :model-value="inputValue"
      :placeholder="placeholder"
      :size="size"
      :ui="{ root: 'mt-0!' }"
      v-bind="$attrs"
      @update:model-value="updateValue"
      @blur="handleBlur"
      @keydown.enter="handleEnter"
    />
  </UFormField>
</template>
