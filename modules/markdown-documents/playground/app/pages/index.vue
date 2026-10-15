<template>
  <UContainer class="space-y-12 py-12 sm:py-20">
    <section class="max-w-3xl space-y-6">
      <UBadge label="Markdown Documents playground" color="primary" variant="subtle" />
      <h1 class="text-4xl font-semibold tracking-tight text-highlighted sm:text-6xl">
        Your content. One public Markdown response.
      </h1>
      <p class="max-w-2xl text-lg leading-relaxed text-muted">
        Connect any server-side source, keep metadata structured, and publish readable Markdown with
        YAML frontmatter. Explore two local articles without a CMS or credentials.
      </p>
      <div class="flex flex-wrap gap-3">
        <UButton to="/documents" label="Explore the responses" icon="i-lucide-code" size="lg" />
        <UButton
          to="/articles/example.md"
          external
          label="Open raw Markdown"
          icon="i-lucide-file-text"
          color="neutral"
          variant="outline"
          size="lg"
        />
      </div>
    </section>

    <section aria-label="Document workflow" class="grid gap-6 md:grid-cols-3">
      <UCard>
        <UIcon name="i-lucide-database" class="mb-4 size-6 text-primary" />
        <h2 class="text-lg font-semibold text-highlighted">Fetch public content</h2>
        <p class="mt-2 leading-relaxed text-muted">
          Retrieve a single article by its slug. Drafts and missing records return 404.
        </p>
      </UCard>
      <UCard>
        <UIcon name="i-lucide-braces" class="mb-4 size-6 text-primary" />
        <h2 class="text-lg font-semibold text-highlighted">Keep useful metadata</h2>
        <p class="mt-2 leading-relaxed text-muted">
          Inspect nested authors, tags, related links, dates, booleans and numbers in JSON.
        </p>
      </UCard>
      <UCard>
        <UIcon name="i-lucide-file-text" class="mb-4 size-6 text-primary" />
        <h2 class="text-lg font-semibold text-highlighted">Serve Markdown</h2>
        <p class="mt-2 leading-relaxed text-muted">
          Get plain text with one YAML frontmatter block and a cleanly separated Markdown body.
        </p>
      </UCard>
    </section>

    <section
      class="flex flex-col gap-4 rounded-xl border border-default p-6 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h2 class="font-semibold text-highlighted">See what gets published</h2>
        <p class="mt-1 text-muted">
          Compare the structured API with the raw article, and check the publication filter.
        </p>
      </div>
      <UButton
        to="/documents"
        label="Inspect documents"
        trailing-icon="i-lucide-arrow-right"
        color="neutral"
        variant="soft"
      />
    </section>
  </UContainer>
</template>
