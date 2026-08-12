<script setup lang="ts">
const { data, error, status } = await useFetch<unknown[]>("/api/_directus-sitemaps/urls");

const json = computed(() => JSON.stringify(data.value ?? [], null, 2));
</script>

<template>
  <div class="space-y-8">
    <UPageHeader
      title="Raw sitemap source"
      description="Inspect the JSON URL entries produced by the Directus sitemap source before @nuxtjs/sitemap renders them."
    >
      <template #headline>
        <UBadge color="neutral" variant="subtle" icon="i-lucide-braces">JSON response</UBadge>
      </template>
    </UPageHeader>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Unable to load sitemap source"
      description="The playground could not read the raw sitemap URL data."
    />

    <UCard v-else class="overflow-hidden ring-1 ring-primary/20">
      <template #header>
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="flex items-start gap-3">
            <div class="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <UIcon name="i-lucide-braces" class="size-5" />
            </div>
            <div>
              <h2 class="font-semibold text-highlighted">Generated URL entries</h2>
              <p class="mt-1 text-sm text-muted">
                The raw response from the sitemap source endpoint.
              </p>
            </div>
          </div>
          <UBadge :color="status === 'pending' ? 'warning' : 'success'" variant="subtle">
            {{ status === "pending" ? "Loading" : `${data?.length ?? 0} entries` }}
          </UBadge>
        </div>
      </template>

      <div class="relative overflow-hidden rounded-xl bg-inverted">
        <div
          class="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary to-transparent"
          aria-hidden="true"
        />
        <pre
          class="max-h-[42rem] overflow-auto p-5 text-sm leading-6 text-inverted"
        ><code>{{ json }}</code></pre>
      </div>
    </UCard>

    <UButton
      to="/"
      label="Back to sitemap routes"
      icon="i-lucide-arrow-left"
      color="neutral"
      variant="outline"
    />
  </div>
</template>
