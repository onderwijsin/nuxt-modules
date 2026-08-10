<script setup lang="ts">
import type { ExtensionSeoMetadata } from "#directus";

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
    <p>Stages 1–3 are configured. Proxy forwarding and client helpers are implemented later.</p>
    <pre>{{ data }}</pre>
    <pre>{{ error }}</pre>
  </div>
</template>
