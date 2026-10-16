<script setup lang="ts">
import { useSeoMeta } from "#imports";

useSeoMeta({
  title: "About · Markdown Documents",
  description: "A playground for content that travels well, from a browser to Markdown."
});
</script>

<template>
  <article class="space-y-12">
    <UButton
      to="/"
      label="Back to playground"
      icon="i-lucide-arrow-left"
      color="neutral"
      variant="link"
    />
    <UPageHero
      title="Good content deserves to travel well."
      description="Made for people. Structured for everything else. A small playground for exploring how one story can reach readers, browsers, and tools alike."
      orientation="horizontal"
      class="overflow-hidden rounded-3xl border border-default bg-linear-to-br from-primary/10 via-default to-elevated"
      :ui="{ container: 'py-12 sm:py-16 lg:py-20', title: 'text-4xl sm:text-5xl lg:text-6xl' }"
    >
      <template #headline>
        <UBadge
          label="The Markdown Documents playground"
          icon="i-lucide-sparkles"
          variant="subtle"
          size="lg"
        />
      </template>
      <template #links>
        <UButton
          to="/articles/example"
          label="Read a story"
          trailing-icon="i-lucide-arrow-up-right"
          size="xl"
        />
        <UButton
          to="/documents"
          label="Under the hood"
          icon="i-lucide-braces"
          color="neutral"
          variant="outline"
          size="xl"
        />
      </template>
      <UCard class="rotate-2 shadow-xl" :ui="{ header: 'bg-elevated/60' }">
        <template #header>
          <div class="flex items-center justify-between gap-4">
            <span class="flex items-center gap-2 text-sm font-medium"
              ><UIcon name="i-lucide-file-text" class="text-primary" /> One story, many
              destinations</span
            >
            <UBadge label="Public" color="success" variant="soft" />
          </div>
        </template>
        <div class="space-y-6">
          <p class="font-mono text-xs text-primary">01 / A FIELD GUIDE</p>
          <h2 class="text-2xl font-semibold text-highlighted">
            Keep the meaning.<br />Let the format change.
          </h2>
          <p class="leading-relaxed text-muted">
            A heading stays a heading. A link keeps its destination. Your content carries the story.
          </p>
          <USeparator />
          <div class="flex flex-wrap gap-2">
            <UBadge label="HTML" color="neutral" variant="outline" />
            <UBadge label="Markdown" color="neutral" variant="outline" />
            <UBadge label="Structured metadata" color="neutral" variant="outline" />
          </div>
        </div>
      </UCard>
    </UPageHero>

    <section aria-labelledby="principles-title" class="space-y-6">
      <div class="max-w-2xl space-y-3">
        <p class="text-sm font-semibold text-primary">A FEW THINGS WE BELIEVE</p>
        <h2 id="principles-title" class="text-3xl font-semibold tracking-tight text-highlighted">
          Clear by design. Useful everywhere.
        </h2>
        <p class="leading-relaxed text-muted">
          We start with small, inspectable examples and give the content room to speak for itself.
        </p>
      </div>
      <UPageGrid>
        <UPageCard
          title="Write for people"
          description="Useful words, thoughtful hierarchy, and links that take you somewhere. Clarity comes first."
          icon="i-lucide-heart-handshake"
          spotlight
        />
        <UPageCard
          title="Keep content portable"
          description="Separate the story from its presentation. Preserve meaning as the format and destination change."
          icon="i-lucide-orbit"
          spotlight
        />
        <UPageCard
          title="Make it inspectable"
          description="Compare the rendered page, public metadata, and original Markdown. Small experiments make differences visible."
          icon="i-lucide-scan-text"
          spotlight
        />
      </UPageGrid>
    </section>

    <USeparator icon="i-lucide-sparkles" />
    <section aria-labelledby="journey-title" class="grid gap-8 lg:grid-cols-2 lg:items-center">
      <div class="space-y-5">
        <UBadge label="Two starting points" variant="soft" />
        <h2 id="journey-title" class="text-3xl font-semibold tracking-tight text-highlighted">
          Same ideas.<br />Different journeys.
        </h2>
        <p class="leading-relaxed text-muted">
          This about page starts as HTML. Our articles start as Markdown with structured metadata.
          Both give us real content to explore as we connect new tools.
        </p>
        <blockquote class="border-l-2 border-primary pl-5 text-lg italic text-toned">
          “Write for people. Give the content enough structure to be useful everywhere else.”
        </blockquote>
      </div>
      <UPageCard title="Follow the content" icon="i-lucide-route" variant="subtle">
        <ol class="list-decimal space-y-4 pl-5 text-muted marker:font-semibold marker:text-primary">
          <li>
            <strong class="text-highlighted">Read the page.</strong> Start with the story in your
            browser.
          </li>
          <li>
            <strong class="text-highlighted">Inspect the source.</strong> Explore the public data
            behind an article.
          </li>
          <li>
            <strong class="text-highlighted">Compare the result.</strong> Check headings, links,
            lists, and quotes after conversion.
          </li>
        </ol>
      </UPageCard>
    </section>

    <UPageCTA
      title="Start with a story."
      description="Meet our example article, then follow its content all the way back to the source."
      variant="subtle"
      class="rounded-3xl bg-linear-to-br from-primary/10 to-default"
    >
      <template #links>
        <UButton
          to="/articles/example"
          label="Explore the article"
          trailing-icon="i-lucide-arrow-right"
          size="lg"
        />
        <UButton
          to="/articles/checklist"
          label="Publication checklist"
          color="neutral"
          variant="outline"
          size="lg"
        />
      </template>
    </UPageCTA>
  </article>
</template>
