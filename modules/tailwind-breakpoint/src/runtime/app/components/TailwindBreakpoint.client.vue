<script setup lang="ts">
import { useBreakpoints } from "@vueuse/core";
import UBadge from "@nuxt/ui/components/Badge.vue";

const styles = getComputedStyle(document.documentElement);
const breakpoints: Record<string, string> = {};

for (const property of styles) {
  if (!property.startsWith("--breakpoint-")) continue;
  const value = styles.getPropertyValue(property).trim();
  if (value) breakpoints[property.slice("--breakpoint-".length)] = value;
}

const active = useBreakpoints(breakpoints).active();
</script>

<template>
  <UBadge
    variant="subtle"
    color="neutral"
    icon="mdi:tailwind"
    :style="{
      pointerEvents: 'none',
      position: 'fixed',
      bottom: '0.33rem',
      left: '0.33rem',
      zIndex: 9999,
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace'
    }"
    :label="active || 'base'"
    aria-hidden="true"
  />
</template>
