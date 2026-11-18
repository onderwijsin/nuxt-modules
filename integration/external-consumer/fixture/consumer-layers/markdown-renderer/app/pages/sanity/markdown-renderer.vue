<script setup lang="ts">
import { shallowRef } from "vue";

const content = shallowRef("Some content");
const anchor = '::MarkdownAnchor{id="existing-fragment"}\n::';
const itemList = `::ItemList
---
divide: true
items:
  - title: Packed item list
    description: Packed list description
    image: /assets/list-image.svg
    to: https://example.com/item-list
    external: true
---
::`;
const layerName = "markdown-renderer";
const relatedItems = `::RelatedItemList
---
items:
  - collection: articles
    item: 7
    label: Packed related article
    data:
      slug: packed-related-article
      summary: Related snapshot proof
---
::`;
const { data } = await useFetch("/api/sanity/markdown-renderer");
</script>

<template>
  <div>
    <MarkdownRenderer :value="content" component-set="sanity" />
    <MarkdownRenderer :value="anchor" component-set="sanity" />
    <MarkdownRenderer :value="itemList" component-set="sanity" />
    <MarkdownRenderer :value="relatedItems" component-set="sanity" />
    <button type="button" @click="content = 'Updated content'">Update Markdown</button>
    <MarkdownRenderer
      value='::MarkdownCallout{title="Markdown renderer"}\nPacked consumer component rendering.\n::'
      component-set="sanity"
    />
    <MarkdownRenderer
      value=':Reference{collection="events" item="42" label="Reference proof"}'
      component-set="sanity"
    />
    <MarkdownRenderer value=':video{src="clip.mp4" controls}' />
    <p :data-sanity="layerName">{{ data }}</p>
  </div>
</template>
