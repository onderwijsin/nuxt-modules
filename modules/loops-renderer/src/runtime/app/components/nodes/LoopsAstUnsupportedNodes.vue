<script setup lang="ts">
import { computed } from "vue";
import type { LoopsLmxElement } from "@onderwijsin/loops-core";
import type { LoopsRendererConfig } from "../../../types";

const props = defineProps<{
  /** Elements deliberately omitted by the safe public renderer. */
  nodes: LoopsLmxElement[];
  config: LoopsRendererConfig;
}>();

/** Pretty JSON makes development inspection useful without ever using a raw HTML renderer. */
const serializedNodes = computed(() => JSON.stringify(props.nodes, null, 2));
</script>

<template>
  <pre v-if="nodes.length">{{ serializedNodes }}</pre>
</template>
