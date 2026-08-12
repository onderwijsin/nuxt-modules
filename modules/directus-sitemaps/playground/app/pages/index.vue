<script setup lang="ts">
const sitemapRoutes = [
  {
    title: "Sitemap index",
    description: "The generated index linking to the named pages and posts sitemaps.",
    path: "/sitemap_index.xml",
    icon: "i-lucide-file-code-2",
    color: "secondary" as const,
    action: "Open index"
  },
  {
    title: "Pretty sitemap URL",
    description: "The human-friendly route that redirects to the sitemap index.",
    path: "/sitemap",
    icon: "i-lucide-forward",
    color: "secondary" as const,
    action: "Follow redirect"
  },
  {
    title: "Pages sitemap",
    description: "Published pages mapped from their Directus permalink values.",
    path: "/__sitemap__/pages.xml",
    icon: "i-lucide-file-text",
    color: "secondary" as const,
    action: "Open pages"
  },
  {
    title: "Posts sitemap",
    description: "Published posts mapped to the playground blog URL structure.",
    path: "/__sitemap__/posts.xml",
    icon: "i-lucide-newspaper",
    color: "secondary" as const,
    action: "Open posts"
  },
  {
    title: "Raw source data",
    description: "Inspect the JSON URL entries returned by the sitemap source.",
    path: "/raw",
    icon: "i-lucide-braces",
    color: "neutral" as const,
    action: "Inspect JSON"
  }
];
</script>

<template>
  <div class="space-y-8">
    <UPageHeader
      title="Directus sitemaps"
      description="Explore the routes generated from your Directus configuration and inspect each sitemap layer."
    >
      <template #headline>
        <UBadge color="success" variant="subtle" icon="i-lucide-circle-check">
          Sitemap module ready
        </UBadge>
      </template>
    </UPageHeader>

    <UCard class="overflow-hidden">
      <div
        class="relative isolate overflow-hidden rounded-lg bg-linear-to-br from-primary/10 via-default to-secondary/10 p-6 sm:p-8"
      >
        <div class="relative max-w-2xl">
          <p class="text-sm font-semibold text-primary">One config, multiple delivery layers</p>
          <h2 class="mt-2 text-2xl font-semibold tracking-tight text-highlighted">
            See how sitemap URLs move from source to XML
          </h2>
          <p class="mt-3 leading-7 text-muted">
            Static entries and Directus-backed collection URLs are combined by the source endpoint,
            then rendered by <code>@nuxtjs/sitemap</code>.
          </p>
        </div>
        <UIcon
          name="i-lucide-sparkles"
          class="absolute -right-4 -top-8 size-40 rotate-12 text-primary/10"
          aria-hidden="true"
        />
      </div>
    </UCard>

    <section class="space-y-4" aria-labelledby="routes-title">
      <div>
        <h2 id="routes-title" class="text-lg font-semibold text-highlighted">Available routes</h2>
        <p class="mt-1 text-sm text-muted">Open a route to inspect its live response.</p>
      </div>

      <div class="grid gap-4 lg:grid-cols-3">
        <UCard v-for="route in sitemapRoutes" :key="route.path" class="flex h-full flex-col">
          <div class="flex flex-1 flex-col gap-5">
            <div class="flex items-start justify-between gap-4">
              <div class="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <UIcon :name="route.icon" class="size-5" />
              </div>
              <UBadge :color="route.color" variant="soft">{{ route.path }}</UBadge>
            </div>
            <div>
              <h3 class="font-semibold text-highlighted">{{ route.title }}</h3>
              <p class="mt-2 text-sm leading-6 text-muted">{{ route.description }}</p>
            </div>
            <UButton
              :to="route.path"
              :label="route.action"
              trailing-icon="i-lucide-arrow-up-right"
              color="neutral"
              variant="outline"
              class="mt-auto w-fit"
            />
          </div>
        </UCard>
      </div>
    </section>
  </div>
</template>
