<script setup lang="ts">
const markdown = `::RelatedItemList
---
items:
  - collection: articles
    item: article-7
    label: Becoming a teacher
    data:
      slug: becoming-a-teacher
      summary: Explore the routes into teaching.
      image: /item-list-example.svg
  - collection: programs
    item: 42
    label: Teaching traineeship
    data:
      slug: teaching-traineeship
      duration: 24
---
::`;
</script>

<template>
  <UContainer class="space-y-8 py-10">
    <div class="space-y-2">
      <h1 class="text-2xl font-semibold">Related item list</h1>
      <p class="text-muted">
        Two ordered CMS selections, rendered by <code>MarkdownRelatedItemList</code> with the
        consumer mapping in <code>app/utils/mapRelatedItem.ts</code> and link resolver in
        <code>app/utils/resolveRelatedItemPath.ts</code>. Summaries and durations become
        descriptions; slugs become link destinations. This example uses a bundled image and needs no
        CMS connection. The persisted node name remains <code>RelatedItemList</code>.
      </p>
    </div>

    <section aria-labelledby="related-items-preview">
      <h2 id="related-items-preview" class="mb-4 text-lg font-semibold">Rendered list</h2>
      <MarkdownRenderer :value="markdown" component-set="demo" />
    </section>

    <section aria-labelledby="related-items-source">
      <h2 id="related-items-source" class="mb-4 text-lg font-semibold">Persisted Markdown</h2>
      <pre class="overflow-x-auto rounded-lg bg-muted p-4 text-sm"><code>{{ markdown }}</code></pre>
    </section>
  </UContainer>
</template>
