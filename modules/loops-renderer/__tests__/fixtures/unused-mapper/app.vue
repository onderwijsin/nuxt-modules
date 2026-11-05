<script setup lang="ts">
import type { LoopsLmxAst } from "@onderwijsin/loops-core";
const data: LoopsLmxAst = {
  type: "root",
  children: [
    {
      type: "element",
      name: "Paragraph",
      attributes: { textColor: "#123456" },
      children: [{ type: "text", value: "No mapping requested" }]
    }
  ]
};
</script>

<template>
  <LoopsRenderer :data="data" :variables="{ contact: {}, data: {}, event: {} }" />
</template>
