<script setup lang="ts">
import { useRouter } from "vue-router";

const storageBrowserPath = useRouter().resolve({ name: "storage-admin" }).href;
</script>

<template>
  <UApp>
    <UHeader title="Storage admin playground" to="/">
      <template #right>
        <UButton icon="i-lucide-database" :to="storageBrowserPath" label="Open storage browser" />
      </template>
    </UHeader>

    <NuxtPage />
  </UApp>
</template>
