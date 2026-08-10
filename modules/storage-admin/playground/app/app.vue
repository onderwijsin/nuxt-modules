<script setup lang="ts">
import { useRouter } from "vue-router";

const storageBrowserPath = useRouter().resolve({ name: "storage-admin" }).href;
</script>

<template>
  <PlaygroundAppShell>
    <template #actions>
      <template #right>
        <UButton icon="i-lucide-database" :to="storageBrowserPath" label="Open storage browser" />
      </template>
    </template>

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </PlaygroundAppShell>
</template>
