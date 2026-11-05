<template>
  <p :data-sanity="layerName">{{ data }}</p>
  <LoopsRenderer :data="ast" :variables="variables" :config="config" />
</template>

<script setup lang="ts">
import type { LoopsLmxAst, LoopsLmxVariables } from "@onderwijsin/loops-core";
import type { LoopsRendererConfig } from "@onderwijsin/nuxt-loops-renderer";

const layerName = "loops-renderer";
const { data } = await useFetch("/api/sanity/loops-renderer");
const ast: LoopsLmxAst = {
  type: "root",
  children: [
    {
      type: "element",
      name: "Paragraph",
      attributes: { textColor: "#ffffff", paddingTop: "16" },
      children: [{ type: "text", value: "Mapped campaign proof" }]
    }
  ]
};
const variables: LoopsLmxVariables = { contact: {}, event: {}, data: {} };
const paletteMapper = createLoopsColorMapper({ color: { "#fefefe": "var(--campaign-text)" } });
const config: LoopsRendererConfig = {
  targetTheme: "light",
  mapColor: (color, context) =>
    context.sourceTheme === "dark" && context.targetTheme === "light"
      ? paletteMapper(color, context)
      : color
};
</script>
