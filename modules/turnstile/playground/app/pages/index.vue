<script setup lang="ts">
const token = ref<string>();
const turnstile = useTemplateRef<{ reset: () => void }>("turnstile");
const { getTokenWithRetry, isEnabled, showMissingTokenErrorHint } = useTurnstile();

async function submit() {
  const currentToken = await getTokenWithRetry();
  if (isEnabled.value && !currentToken) {
    showMissingTokenErrorHint();
    return;
  }
  await $fetch("/api/turnstile-example", {
    method: "POST",
    headers: currentToken ? { "x-turnstile-token": currentToken } : undefined
  });
  turnstile.value?.reset();
}
</script>

<template>
  <UContainer class="py-12 space-y-4">
    <NuxtTurnstile ref="turnstile" v-model="token" :options="{ action: 'playground' }" />
    <UButton label="Submit protected request" @click="submit" />
  </UContainer>
</template>
