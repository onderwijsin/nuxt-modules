<script setup lang="ts">
const { data, error, status } = await useAsyncData("simulated-pages-preview", () =>
  useDirectusItemByPath("articles", { fields: ["id", "title"] })
);

const isSuccessful = computed(() => status.value === "success" && !error.value);
</script>

<template>
  <UContainer class="space-y-8 py-8">
    <UPageHeader
      title="Versioned preview"
      description="Inspect the request context and result of a versioned item lookup."
    />

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="text-sm text-muted">Resolved request</p>
            <h2 class="mt-1 text-xl font-semibold text-highlighted">articles / article item</h2>
          </div>
          <UBadge :color="isSuccessful ? 'success' : error ? 'error' : 'warning'" variant="subtle">
            {{ isSuccessful ? "Loaded" : error ? "Failed" : "Loading" }}
          </UBadge>
        </div>
      </template>

      <dl class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-lg bg-muted/30 p-4">
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">Collection</dt>
          <dd class="mt-1 font-mono text-sm text-highlighted">articles</dd>
        </div>
        <div class="rounded-lg bg-muted/30 p-4">
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">Item ID</dt>
          <dd class="mt-1 break-all font-mono text-sm text-highlighted">
            1aefcdec-e02a-4193-b1dc-99cb7a85cfd4
          </dd>
        </div>
        <div class="rounded-lg bg-muted/30 p-4">
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">Version</dt>
          <dd class="mt-1 font-mono text-sm text-highlighted">test</dd>
        </div>
        <div class="rounded-lg bg-muted/30 p-4">
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">Strategy</dt>
          <dd class="mt-1 font-mono text-sm text-highlighted">readItem(id, version)</dd>
        </div>
      </dl>

      <UAlert
        v-if="error"
        class="mt-5"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        title="Preview request failed"
        description="Check the preview token and Directus version configuration."
      />
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-braces" class="size-5 text-primary" />
          <h2 class="font-semibold text-highlighted">Response</h2>
        </div>
      </template>

      <div
        v-if="isSuccessful && data"
        class="flex items-center gap-4 rounded-lg bg-success-50 p-4 text-success-800 dark:bg-success-950/30 dark:text-success-200"
      >
        <UIcon name="i-lucide-circle-check" class="size-6 shrink-0" />
        <div>
          <p class="font-medium">Preview item loaded</p>
          <p class="mt-1 text-sm opacity-80">
            The composable returned the first matching page item.
          </p>
        </div>
      </div>
      <div
        v-else-if="error"
        class="rounded-lg bg-error-50 p-4 text-sm text-error-800 dark:bg-error-950/30 dark:text-error-200"
      >
        The request returned an error. Use the Errors route to inspect normalized failure states.
      </div>
      <div v-else class="rounded-lg bg-muted/30 p-4 text-sm text-muted">
        Waiting for the preview response…
      </div>
      <pre v-if="data" class="mt-5 overflow-auto rounded-lg bg-muted/30 p-4 text-xs text-muted">{{
        data
      }}</pre>
    </UCard>
  </UContainer>
</template>
