<script setup lang="ts">
const turnstile = useTemplateRef<{ reset: () => void }>("turnstile");
const { token, getTokenWithRetry, isEnabled, showMissingTokenErrorHint, captureTurnstileError } =
  useTurnstile();

const loading = ref(false);
const success = ref(false);
const error = ref<string | null>(null);

async function submit() {
  loading.value = true;
  const currentToken = await getTokenWithRetry();
  if (isEnabled.value && !currentToken) {
    showMissingTokenErrorHint();
    loading.value = false;
    return;
  }
  try {
    await $fetch("/api/turnstile-example", {
      method: "POST",
      headers: currentToken ? { "x-turnstile-token": currentToken } : undefined
    });
    success.value = true;
    error.value = null;
  } catch (err: unknown) {
    if (captureTurnstileError(err)) {
      return;
    }
    error.value = err instanceof Error ? err.message : "An error occurred";
    success.value = false;
  } finally {
    loading.value = false;
    turnstile.value?.reset();
  }
}

function reset() {
  loading.value = false;
  success.value = false;
  error.value = null;
  turnstile.value?.reset();
}
</script>

<template>
  <UContainer class="py-12 space-y-4">
    <NuxtTurnstile
      ref="turnstile"
      v-model="token"
      :options="{ action: 'playground', appearance: 'interaction-only' }"
      class="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0"
    />
    <UButton
      label="Submit protected request"
      @click="submit"
      color="neutral"
      :loading="loading"
      :disabled="success || !!error"
    />
    <UAlert
      v-if="error"
      color="error"
      :title="error"
      variant="soft"
      :actions="[{ label: 'Reset', onClick: reset, color: 'error' }]"
    />
    <UAlert
      v-if="success"
      color="success"
      variant="soft"
      :title="'Request successful'"
      :actions="[{ label: 'Reset', onClick: reset, color: 'success' }]"
    />
  </UContainer>
</template>
