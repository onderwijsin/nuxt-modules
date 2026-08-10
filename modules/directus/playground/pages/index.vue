<script setup lang="ts">
import type { ExtensionSeoMetadata } from "#directus";
const data: Partial<ExtensionSeoMetadata> = {};
</script>

<template>
  <div>
    <h1>Directus module playground</h1>
    <p>Stages 1–3 are configured. Proxy forwarding and client helpers are implemented later.</p>
    <pre>{{ data }}</pre>
  </div>
</template>
