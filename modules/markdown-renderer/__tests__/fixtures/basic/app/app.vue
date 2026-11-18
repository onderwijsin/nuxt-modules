<script setup lang="ts">
const anchor = '::MarkdownAnchor{id="existing-fragment"}\n::';
const reference = `:Reference{collection="articles" item="article-7" label="Reference config proof" :data='{"slug":"reference-example"}'}`;
const itemList = `::ItemList
---
divide: true
items:
  - image: /assets/list-image.svg
    title: Image item
    description: Image wins over icon.
    to: https://example.com/item
    external: true
    icon: i-lucide-image
  - title: Internal item
    to: /internal-item
    icon: i-lucide-info
  - description: Description only
    external: true
  - {}
---
::`;
const relatedItemList = `::RelatedItemList
---
items:
  - collection: articles
    item: article-7
    label: Becoming a teacher
    data:
      slug: becoming-a-teacher
      summary: Explore the routes into teaching.
      image: image-uuid
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
  <MarkdownRenderer value="Some content" component-set="demo" />
  <MarkdownRenderer :value="anchor" component-set="demo" />
  <section id="item-list-example">
    <MarkdownRenderer :value="itemList" component-set="demo" />
  </section>
  <MarkdownRenderer :value="relatedItemList" component-set="demo" />
  <MarkdownRenderer :value="reference" component-set="demo" />
  <MarkdownRenderer value=':video{src="clip.mp4" controls}' />
  <MarkdownRenderer
    value='![Alt text](/assets/4b4849c5-fdcf-4522-b090-adb9530ff526){width="300"}'
  />
</template>
