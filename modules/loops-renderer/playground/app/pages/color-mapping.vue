<script setup lang="ts">
import { computed, shallowRef } from "vue";
import type { LoopsRendererTheme } from "@onderwijsin/nuxt-loops-renderer";
import { createWorkshopConfig } from "~/utils/workshop-colors";

const { data: examples, error } = await useFetch("/api/emails/workshop");
const theme = shallowRef<LoopsRendererTheme>("dark");
const config = computed(() => createWorkshopConfig(theme.value));
</script>

<template>
  <main class="space-y-8">
    <UPageHeader
      title="One invitation, your palette"
      description="A realistic workshop invitation with authored text, links, section backgrounds, borders and a button. Exact source colors map to the host application's CSS tokens."
    />
    <div class="flex flex-wrap items-center gap-3" role="group" aria-label="Email preview theme">
      <UButton
        label="Original light email"
        color="neutral"
        :variant="theme === 'light' ? 'solid' : 'outline'"
        :aria-pressed="theme === 'light'"
        @click="theme = 'light'"
      />
      <UButton
        label="Mapped dark email"
        color="neutral"
        :variant="theme === 'dark' ? 'solid' : 'outline'"
        :aria-pressed="theme === 'dark'"
        @click="theme = 'dark'"
      />
      <span class="text-sm text-muted">Exact matches only</span>
    </div>
    <UAlert v-if="error" color="error" title="Could not load the workshop invitation" />
    <div v-else-if="examples" class="mx-auto max-w-3xl">
      <EmailPreview :example="examples.exact" :theme="theme" :config="config" />
      <p class="mt-4 text-center text-xs text-muted">
        The AST stays in light mode. Only the consumer's rendering policy changes.
      </p>
    </div>
  </main>
</template>
