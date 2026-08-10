<script setup lang="ts">
import { useRedirectsStore } from "@onderwijsin/nuxt-redirects/runtime/store";

const store = useRedirectsStore();
</script>

<template>
  <div>
    <UPageHeader
      title="See redirects in action"
      description="Explore exact, parameterized, and wildcard redirects backed by Nitro storage and the Pinia store."
    />

    <div class="gap-6 lg:grid lg:grid-cols-2">
      <UCard>
        <template #header>
          <div class="flex items-start gap-3">
            <div class="rounded-lg bg-primary/10 size-12 grid place-items-center text-primary">
              <UIcon name="i-lucide-server" class="size-5" />
            </div>
            <div>
              <h2 class="font-semibold text-highlighted">Exact redirects</h2>
              <p class="mt-1 text-sm text-muted">Storage lookups that match one known origin.</p>
            </div>
          </div>
        </template>

        <div class="space-y-3">
          <div>
            <UButton to="/client-origin" block trailing-icon="i-lucide-arrow-right">
              Test client middleware
            </UButton>
            <p class="mt-2 text-sm text-muted">
              Client navigation from <code>/client-origin</code> resolves to
              <code>/client-destination</code>.
            </p>
          </div>
          <div>
            <UButton
              href="/server-origin"
              block
              color="neutral"
              variant="outline"
              trailing-icon="i-lucide-arrow-right"
            >
              Test server middleware
            </UButton>
            <p class="mt-2 text-sm text-muted">
              A full request from <code>/server-origin</code> resolves to
              <code>/server-destination</code>.
            </p>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-start gap-3">
            <div class="rounded-lg bg-secondary/10 size-12 grid place-items-center text-secondary">
              <UIcon name="i-lucide-sparkles" class="size-5" />
            </div>
            <div>
              <h2 class="font-semibold text-highlighted">Dynamic patterns</h2>
              <p class="mt-1 text-sm text-muted">`regexparam` captures values from the pathname.</p>
            </div>
          </div>
        </template>

        <div class="space-y-3">
          <div>
            <UButton to="/legacy/guides/getting-started" block trailing-icon="i-lucide-arrow-right">
              Test named parameters
            </UButton>
            <p class="mt-2 text-sm text-muted">
              Client navigation from <code>/legacy/guides/getting-started</code> resolves to
              <code>/dynamic-destination/guides/getting-started</code>.
            </p>
          </div>
          <div>
            <UButton
              href="/files/reports/2026/summary.pdf"
              block
              color="neutral"
              variant="outline"
              trailing-icon="i-lucide-arrow-right"
            >
              Test wildcard matching
            </UButton>
            <p class="mt-2 text-sm text-muted">
              A full request from <code>/files/reports/2026/summary.pdf</code> resolves to
              <code>/dynamic-destination/files/reports/2026/summary.pdf</code>.
            </p>
          </div>
        </div>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-4">
          <div>
            <h2 class="font-semibold text-highlighted">Client store snapshot</h2>
            <p class="mt-1 text-sm text-muted">
              The exact index and dynamic payload currently loaded in Pinia.
            </p>
          </div>
          <UBadge color="success" variant="subtle">{{
            store.isRefreshing ? "Refreshing" : "Synced"
          }}</UBadge>
        </div>
      </template>

      <pre class="max-h-80 overflow-auto rounded-lg bg-inverted p-4 text-xs text-inverted">{{
        JSON.stringify({ exact: store.records, dynamic: store.dynamicRules }, null, 2)
      }}</pre>
    </UCard>
  </div>
</template>
