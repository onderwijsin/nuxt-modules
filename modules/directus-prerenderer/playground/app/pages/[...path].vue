<script setup lang="ts">
const route = useRoute();
</script>

<template>
  <UCard>
    <UPageHeader
      title="Prerendered route"
      :description="`This catch-all playground page was rendered for ${route.fullPath}.`"
    />
    <div class="mt-6 rounded-lg bg-elevated p-4">
      <code class="text-sm text-highlighted">{{ route.fullPath }}</code>
    </div>
  </UCard>
</template>
