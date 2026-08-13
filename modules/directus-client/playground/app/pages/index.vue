<script setup lang="ts">
interface ArticlePreview {
  id: string;
}

const config = useRuntimeConfig();
const previewUrl = computed(() => {
  const query = new URLSearchParams({
    preview: "true",
    id: "1aefcdec-e02a-4193-b1dc-99cb7a85cfd4",
    version: "test"
  });
  if (config.public.playgroundPreviewToken)
    query.set("token", config.public.playgroundPreviewToken);
  return `/preview?${query.toString()}`;
});

const { data, error, status } = await useAsyncData<ArticlePreview[]>("articles-overview", () =>
  useDirectus(readItems("articles", { fields: ["id"] }))
);

const requestStatus = computed(() => {
  if (status.value === "pending") return "Loading";
  if (error.value) return "Request failed";
  return "Connected";
});
</script>

<template>
  <UContainer class="space-y-8 py-8">
    <UPageHeader
      title="Directus playground"
      description="Inspect the client request, preview lookup, and error normalization behavior."
    />

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="text-sm text-muted">Live client request</p>
            <h2 class="mt-1 text-xl font-semibold text-highlighted">Read article IDs</h2>
          </div>
          <UBadge
            :color="error ? 'error' : status === 'pending' ? 'warning' : 'success'"
            variant="subtle"
          >
            {{ requestStatus }}
          </UBadge>
        </div>
      </template>

      <div class="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
        <UAlert
          v-if="error"
          color="error"
          variant="soft"
          icon="i-lucide-circle-alert"
          title="The request could not be completed"
          description="Check the Directus URL and credentials configured for the playground."
        />
        <div v-else>
          <p class="text-4xl font-semibold tracking-tight text-highlighted">
            {{ data?.length ?? 0 }}
          </p>
          <p class="mt-1 text-sm text-muted">article{{ data?.length === 1 ? "" : "s" }} returned</p>
        </div>

        <dl class="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <dt class="text-muted">Collection</dt>
            <dd class="font-mono text-highlighted">articles</dd>
          </div>
          <div>
            <dt class="text-muted">Command</dt>
            <dd class="font-mono text-highlighted">readItems</dd>
          </div>
          <div>
            <dt class="text-muted">Fields</dt>
            <dd class="font-mono text-highlighted">id</dd>
          </div>
          <div>
            <dt class="text-muted">Limit</dt>
            <dd class="font-mono text-highlighted">Directus default</dd>
          </div>
        </dl>
      </div>
    </UCard>

    <section class="space-y-4" aria-labelledby="demos-title">
      <div>
        <h2 id="demos-title" class="text-lg font-semibold text-highlighted">Demos</h2>
        <p class="mt-1 text-sm text-muted">Open a focused route to inspect a specific behavior.</p>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <UCard>
          <div class="flex h-full flex-col gap-5">
            <div class="flex gap-3">
              <UIcon name="i-lucide-eye" class="mt-0.5 size-5 text-primary" />
              <div>
                <h3 class="font-semibold text-highlighted">Versioned preview</h3>
                <p class="mt-1 text-sm leading-6 text-muted">
                  Fetch one page by ID from the <code>test</code> version.
                </p>
              </div>
            </div>
            <UButton
              to="/preview"
              label="Open preview"
              trailing-icon="i-lucide-arrow-right"
              class="w-fit"
            />
          </div>
        </UCard>

        <UCard>
          <div class="flex h-full flex-col gap-5">
            <div class="flex gap-3">
              <UIcon name="i-lucide-triangle-alert" class="mt-0.5 size-5 text-warning" />
              <div>
                <h3 class="font-semibold text-highlighted">Error handling</h3>
                <p class="mt-1 text-sm leading-6 text-muted">
                  Trigger common failures and verify the normalized error helpers.
                </p>
              </div>
            </div>
            <UButton
              to="/error"
              label="Open errors"
              trailing-icon="i-lucide-arrow-right"
              color="neutral"
              variant="outline"
              class="w-fit"
            />
          </div>
        </UCard>
      </div>
    </section>

    <UCard v-if="error">
      <template #header>
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="text-sm text-muted">Error response</p>
            <h2 class="mt-1 text-xl font-semibold text-highlighted">
              Check the error returned by Directus Client
            </h2>
          </div>
          <UBadge color="error" variant="subtle">
            {{ error?.status }}
          </UBadge>
        </div>
      </template>
      <pre class="overflow-auto rounded-lg bg-muted/30 p-4 text-sm text-muted">{{ error }}</pre>
    </UCard>
  </UContainer>
</template>
