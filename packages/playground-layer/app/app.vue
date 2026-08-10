<script lang="ts" setup>
const app = useAppConfig();
</script>

<template>
  <PlaygroundAppShell>
    <template #actions>
      <UButton v-for="action in app.header?.actions ?? []" v-bind="action" />
    </template>

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </PlaygroundAppShell>
</template>
