<script setup lang="ts">
import { computed } from "vue";

const route = useRoute();
const destinationPath = computed(() => {
  const path = route.params.path;
  return `/${Array.isArray(path) ? path.join("/") : (path ?? "")}`;
});
</script>

<template>
  <UContainer class="py-10 sm:py-14 space-y-16">
    <UPageHeader
      title="Dynamic redirect succeeded"
      description="This page was reached after a pattern rule captured and interpolated part of the request pathname."
    />

    <UCard>
      <template #header>
        <div class="flex items-start gap-3">
          <div class="rounded-lg bg-success/10 size-12 grid place-items-center text-success">
            <UIcon name="i-lucide-check-circle-2" class="size-5" />
          </div>
          <div>
            <h2 class="font-semibold text-highlighted">Resolved destination</h2>
            <p class="mt-1 text-sm text-muted">Redirect complete</p>
          </div>
        </div>
      </template>
      <code class="block rounded-lg bg-muted p-4 text-sm text-toned">{{ destinationPath }}</code>
      <template #footer>
        <UButton to="/" color="neutral" variant="outline" leading-icon="i-lucide-arrow-left">
          Back to playground
        </UButton>
      </template>
    </UCard>
  </UContainer>
</template>
