<template>
  <LoopsRenderer :data="data" :variables="variables" :config="config" />
</template>

<script setup lang="ts">
import { createLoopsColorMapper } from "#imports";
import type { LoopsRendererConfig } from "../../../src/runtime/types";
import type { LoopsLmxAst } from "@onderwijsin/loops-core";

const paletteMapper = createLoopsColorMapper({ color: { "#123456": "var(--campaign-text)" } });
const config: LoopsRendererConfig = {
  targetTheme: "dark",
  mapColor: (color, context) =>
    context.sourceTheme === "light" && context.targetTheme === "dark"
      ? paletteMapper(color, context)
      : undefined
};

const data: LoopsLmxAst = {
  type: "root",
  children: [
    {
      type: "element",
      name: "Paragraph",
      attributes: { textColor: "#123457" },
      children: [{ type: "text", value: "Near color" }]
    },
    {
      type: "element",
      name: "H1",
      attributes: { textColor: "#123456", paddingTop: "16" },
      children: [{ type: "text", value: "Welcome {contact.firstName}" }]
    },
    {
      type: "element",
      name: "Paragraph",
      attributes: {},
      children: [
        {
          type: "element",
          name: "Link",
          attributes: { href: "https://example.com/profile" },
          children: [{ type: "text", value: "View your profile" }]
        }
      ]
    }
  ]
};

const variables = {
  contact: { firstName: "Ada" },
  data: {},
  event: {}
};
</script>
