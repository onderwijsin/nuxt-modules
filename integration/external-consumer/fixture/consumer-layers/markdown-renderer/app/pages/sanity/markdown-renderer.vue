<script setup lang="ts">
import { shallowRef } from "vue";

const content = shallowRef("Some content");
const layerName = "markdown-renderer";
const { data } = await useFetch("/api/sanity/markdown-renderer");
</script>

<template>
  <div>
    <MarkdownRenderer :value="content" component-set="sanity" />
    <button type="button" @click="content = 'Updated content'">Update Markdown</button>
    <MarkdownRenderer
      value='::MarkdownCallout{title="Markdown renderer"}\nPacked consumer component rendering.\n::'
      component-set="sanity"
    />
    <MarkdownRenderer value=':video{src="clip.mp4" controls}' />
    <p :data-sanity="layerName">{{ data }}</p>
  </div>
</template>
