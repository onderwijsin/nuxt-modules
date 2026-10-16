<script setup lang="ts">
import { computed } from "vue";
import type { findPublicArticle } from "../../server/utils/example-articles";

import shiki from "@comark/nuxt/plugins/shiki";
import githubLight from "@shikijs/themes/github-light";
import githubDark from "@shikijs/themes/github-dark";

const plugins = [
  shiki({
    themes: { light: githubLight, dark: githubDark }
  })
];

const props = defineProps<{
  article: Omit<NonNullable<Awaited<ReturnType<typeof findPublicArticle>>>, "status">;
}>();

// The page header already displays the title supplied as the body's first heading.
const body = computed(() => {
  const heading = `# ${props.article.title}\n`;
  return props.article.body.startsWith(heading)
    ? props.article.body.slice(heading.length).trimStart()
    : props.article.body;
});

const publishedDate = computed(() =>
  new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(props.article.publishedAt))
);
</script>

<template>
  <article class="mx-auto max-w-4xl space-y-10">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <UButton
        to="/about"
        label="About the playground"
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="link"
      />
      <UBadge
        v-if="article.featured"
        label="Featured story"
        icon="i-lucide-sparkles"
        variant="subtle"
      />
    </div>

    <header
      class="space-y-6 rounded-3xl border border-default bg-linear-to-br from-primary/10 via-default to-elevated p-6 sm:p-12"
    >
      <div class="flex flex-wrap gap-2">
        <UBadge
          v-for="tag in article.tags"
          :key="tag"
          :label="tag"
          color="neutral"
          variant="outline"
        />
      </div>
      <h1 class="text-4xl font-semibold tracking-tight text-highlighted sm:text-5xl">
        {{ article.title }}
      </h1>
      <p class="text-lg leading-relaxed text-muted">{{ article.description }}</p>
      <USeparator />
      <div class="flex flex-wrap items-center justify-between gap-6">
        <div class="flex items-center gap-3">
          <UAvatar :alt="article.author.name" size="lg" />
          <div>
            <p class="font-medium text-highlighted">{{ article.author.name }}</p>
            <p class="text-sm text-muted">{{ article.author.role }}</p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-4 text-sm text-muted">
          <time :datetime="article.publishedAt">{{ publishedDate }}</time>
          <span class="inline-flex items-center gap-1.5"
            ><UIcon name="i-lucide-clock-3" />{{ article.readingMinutes }} min read</span
          >
        </div>
      </div>
    </header>

    <div class="min-w-0">
      <MarkdownRenderer :value="body" :plugins="plugins" />
    </div>

    <USeparator />
    <section v-if="article.related.length" aria-labelledby="related-title" class="space-y-5">
      <h2 id="related-title" class="text-2xl font-semibold text-highlighted">Keep exploring</h2>
      <UPageCard
        v-for="related in article.related"
        :key="related.path"
        :title="related.title"
        :to="related.path"
        icon="i-lucide-book-open"
        variant="subtle"
      />
    </section>
    <UCard variant="subtle">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="font-medium text-highlighted">Follow the story back to its source</p>
          <p class="mt-1 text-sm text-muted">
            The same content, served as public Markdown or structured JSON.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <UButton
            :to="`/articles/${article.slug}.md`"
            external
            label="Markdown"
            icon="i-lucide-file-text"
            color="neutral"
            variant="outline"
          />
          <UButton
            :to="`/api/articles/${article.slug}`"
            external
            label="JSON"
            icon="i-lucide-braces"
            color="neutral"
            variant="ghost"
          />
        </div>
      </div>
    </UCard>
  </article>
</template>
