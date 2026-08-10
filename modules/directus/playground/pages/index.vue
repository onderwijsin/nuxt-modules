<script setup lang="ts">
import type { ExtensionSeoMetadata } from "#directus";

const config = useRuntimeConfig();
const previewUrl = computed(() => {
  const query = new URLSearchParams({
    preview: "true",
    id: "1aefcdec-e02a-4193-b1dc-99cb7a85cfd4",
    version: "test"
  });
  if (config.public.playgroundPreviewToken) {
    query.set("token", config.public.playgroundPreviewToken);
  }
  return `/preview?${query.toString()}`;
});

const { data, error } = await useAsyncData(() =>
  useDirectus(
    readItems("articles", {
      fields: ["id"]
    })
  )
);
</script>

<template>
  <div>
    <h1>Directus module playground</h1>
    <p>Directus proxy and client helpers are available for local testing.</p>
    <p>
      <NuxtLink :to="previewUrl">Simulate the pages version preview</NuxtLink>
      (configure <code>DIRECTUS_PREVIEW_TOKEN</code> in <code>.env</code> first).
    </p>
    <pre>{{ data }}</pre>
    <pre>{{ error }}</pre>
  </div>
</template>
