<script setup lang="ts">
import { computed } from "vue";
import { useFetch } from "#imports";

import shiki from "@comark/nuxt/plugins/shiki";
import githubLight from "@shikijs/themes/github-light";
import githubDark from "@shikijs/themes/github-dark";

const plugins = [
  shiki({
    themes: { light: githubLight, dark: githubDark }
  })
];

const { data, error } = await useFetch("/api/documents");
const { data: markdown, error: markdownError } = await useFetch<string>("/articles/example.md", {
  responseType: "text"
});
const json = computed(() => `\`\`\`json\n${JSON.stringify(data.value, null, 2) ?? "{}"}\n\`\`\``);
// A longer outer fence keeps code fences inside the document visible as source text.
const markdownCode = computed(() => {
  const source = markdown.value ?? "";
  const fences = source.match(/`+/g) ?? [];
  const fence = "`".repeat(Math.max(3, ...fences.map((value) => value.length + 1)));
  return `${fence}markdown\n${source}\n${fence}`;
});
</script>

<template>
  <UContainer class="space-y-10 py-10">
    <header class="space-y-4">
      <UButton
        to="/"
        label="Back to overview"
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="link"
        class="p-0"
      />
      <h1 class="text-3xl font-semibold tracking-tight text-highlighted">
        Inspect the document responses
      </h1>
      <p class="max-w-3xl leading-relaxed text-muted">
        The API resolves one article and lists public metadata separately. The raw response contains
        the same article, with nested metadata serialized to YAML and a single blank line before the
        body.
      </p>
    </header>

    <UAlert
      v-if="error || markdownError"
      color="error"
      title="Unable to load the example responses"
      description="Check the playground server and reload this page."
    />
    <template v-else>
      <section aria-labelledby="json-title" class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 id="json-title" class="text-xl font-semibold text-highlighted">Structured JSON</h2>
          <UButton
            to="/api/documents"
            external
            label="Open API"
            icon="i-lucide-external-link"
            color="neutral"
            variant="outline"
            size="sm"
          />
        </div>
        <MarkdownRenderer :value="json" :plugins="plugins" />
      </section>

      <section aria-labelledby="markdown-title" class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 id="markdown-title" class="text-xl font-semibold text-highlighted">
            Raw Markdown with frontmatter
          </h2>
          <UButton
            :to="data?.url"
            external
            label="Open Markdown"
            icon="i-lucide-external-link"
            color="neutral"
            variant="outline"
            size="sm"
          />
        </div>
        <MarkdownRenderer :value="markdownCode" :plugins="plugins" />
      </section>

      <section aria-labelledby="listing-title" class="space-y-4">
        <h2 id="listing-title" class="text-xl font-semibold text-highlighted">Public documents</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <UCard v-for="entry in data?.entries" :key="entry.path">
            <h3 class="font-semibold text-highlighted">{{ entry.title }}</h3>
            <p class="mt-2 text-sm leading-relaxed text-muted">{{ entry.description }}</p>
            <UButton
              :to="`${entry.path}.md`"
              external
              label="Read Markdown"
              trailing-icon="i-lucide-arrow-right"
              color="neutral"
              variant="link"
              class="mt-4 p-0"
            />
          </UCard>
        </div>
        <p class="text-sm text-muted">
          The source also contains a draft. It is excluded from this listing;
          <NuxtLink to="/articles/draft.md" external class="text-primary underline"
            >requesting it returns 404</NuxtLink
          >.
        </p>
      </section>
    </template>
  </UContainer>
</template>
