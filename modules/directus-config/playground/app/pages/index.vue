<script setup lang="ts">
import clientConfig from "#directus-config";
const { data: serverConfig } = await useFetch("/api/config");
</script>

<template>
  <section>
    <UPageHeader
      title="Directus Client Config"
      description="View the client safe sanitized Directus configuration."
    />
    <pre>{{ JSON.stringify(clientConfig, null, 2) }}</pre>
  </section>
  <section>
    <UPageHeader
      title="Directus Server Config"
      description="View the server side full Directus configuration."
    />
    <pre>{{ JSON.stringify(serverConfig, null, 2) }}</pre>
  </section>
</template>
