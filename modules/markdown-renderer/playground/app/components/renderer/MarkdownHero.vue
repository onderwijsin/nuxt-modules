<script setup lang="ts">
import { defineEditorComponentSchema } from "#imports";
import type { BadgeProps } from "@nuxt/ui";

defineEditorComponentSchema({
  label: "Hero",
  description: "A prominent page introduction with an optional call to action.",
  type: "block",
  properties: {
    image: { properties: { src: { input: { type: "image" } } } },
    actions: { items: { properties: { to: { input: "url" } } } }
  }
});

const props = withDefaults(
  defineProps<{
    /** Short text displayed above the title. */
    eyebrow?: string;
    /** Main hero heading. */
    title: string;
    /** Supporting introductory copy. */
    description?: string;
    /** Horizontal content alignment. */
    align?: "left" | "center";
    /** Hero accent color. */
    tone?: BadgeProps["color"];
    /** Tags to render above the hero section. */
    tags?: string[];
    /** Optional hero image. */
    image?: {
      /** Image source URL. */
      src: string;
      /** Alternative text for the image. */
      alt?: string;
    };
    /** Optional call-to-action buttons. */
    actions?: {
      /** Action label. */
      label: string;
      /** Action destination URL. */
      to: string;
      /** Action icon. */
      icon?: string;
    }[];
  }>(),
  { align: "left", tone: "primary" }
);
</script>

<template>
  <section
    class="rounded-2xl border border-default bg-elevated px-6 py-12 sm:px-10"
    :class="props.align === 'center' ? 'text-center' : 'text-left'"
  >
    <UBadge v-if="props.eyebrow" :color="props.tone" variant="subtle" class="mb-4">
      {{ props.eyebrow }}
    </UBadge>
    <h1 class="text-4xl font-bold tracking-tight text-highlighted sm:text-5xl">
      {{ props.title }}
    </h1>
    <p v-if="props.description" class="mt-4 text-lg text-muted">
      {{ props.description }}
    </p>
    <div v-if="$slots.default" class="mt-6 text-toned">
      <slot />
    </div>
    <UFieldGroup v-if="props.actions?.length">
      <UButton
        v-for="action in props.actions"
        :key="action.to"
        class="mt-8"
        :label="action.label"
        :to="action.to"
        :color="props.tone"
      />
    </UFieldGroup>
  </section>
</template>
