<template>
  <main>
    <h1>External consumer OK</h1>
    <p data-sanity="static-text">{{ text }}</p>
    <p data-sanity="template-translation">{{ $t("external.consumer") }}</p>
    <p data-sanity="device">Device: {{ device.isMobile ? "mobile" : "desktop" }}</p>
    <p data-sanity="draft-form">Draft: {{ draft.state.value }}</p>
    <p data-sanity="turnstile">Turnstile: {{ turnstile.isEnabled ? "enabled" : "disabled" }}</p>
    <NuxtLink to="/redirect-sanity" data-sanity="redirect-client-link">Client redirect</NuxtLink>
    <LoopsRenderer :data="loopsAst" :variables="loopsVariables" />
  </main>
</template>

<script setup lang="ts">
const text = useText("external.consumer");
const device = useDevice();
const turnstile = useTurnstile();
const draft = useDraftForm({
  getSource: () => ({ value: "ready" }),
  save: async () => undefined,
  onError: () => undefined
});

const loopsAst = {
  type: "root",
  children: [
    {
      type: "element",
      name: "Paragraph",
      attributes: {},
      children: [{ type: "text", value: "Renderer OK" }]
    }
  ]
} as const;

const loopsVariables = { contact: {}, data: {}, event: {} };
</script>
