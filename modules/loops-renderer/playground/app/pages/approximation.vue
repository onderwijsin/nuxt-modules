<script setup lang="ts">
import { createWorkshopConfig } from "~/utils/workshop-colors";

const { data: examples, error } = await useFetch("/api/emails/workshop");
const exactConfig = createWorkshopConfig("dark", 0);
const approximateConfig = createWorkshopConfig("dark", 0.03);
</script>

<template>
  <main class="space-y-8">
    <UPageHeader
      title="Close colors, the same intent"
      description="The same invitation is rendered twice, with the same palette and dark theme. A few authored colors differ slightly from the palette: approximation reuses their nearest source mapping."
    />
    <p class="text-sm text-muted">
      Compare the blue session panel, the host section and the workbook links. Both examples retain
      exact matches; the right-hand example also accepts nearby colors within an OKLab distance of
      0.03.
    </p>
    <UAlert v-if="error" color="error" title="Could not load the comparison email" />
    <div v-else-if="examples" class="grid items-start gap-6 xl:grid-cols-2">
      <section class="min-w-0 space-y-4" aria-labelledby="exact-title">
        <div>
          <h2 id="exact-title" class="text-lg font-semibold text-highlighted">
            Without approximation
          </h2>
          <p class="text-sm text-muted">Unmatched colors keep their authored values.</p>
        </div>
        <EmailPreview :example="examples.nearby" theme="dark" :config="exactConfig" />
      </section>
      <section class="min-w-0 space-y-4" aria-labelledby="approximate-title">
        <div>
          <h2 id="approximate-title" class="text-lg font-semibold text-highlighted">
            With approximation
          </h2>
          <p class="text-sm text-muted">Nearby source colors follow the same dark palette.</p>
        </div>
        <EmailPreview :example="examples.nearby" theme="dark" :config="approximateConfig" />
      </section>
    </div>
  </main>
</template>
