<script setup lang="ts">
import { useRedirectsStore } from "@onderwijsin/nuxt-redirects/runtime/store";

const store = useRedirectsStore();
</script>

<template>
  <main>
    <h1>Redirects playground</h1>
    <p>
      <NuxtLink to="/client-origin">Test client middleware redirect</NuxtLink>
    </p>
    <p>
      <a href="/server-origin">Test server middleware redirect</a>
    </p>

    <h2>Client redirect store</h2>
    <pre>{{ store.records }}</pre>
  </main>
</template>
