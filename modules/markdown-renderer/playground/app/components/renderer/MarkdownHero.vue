<script setup lang="ts">
import { defineEditorComponentSchema } from "#imports";

defineEditorComponentSchema({
  label: "Hero",
  description: "A prominent page introduction with an optional call to action.",
  type: "block",
  props: {
    align: { values: ["left", "center"] },
    actionTo: { input: "url" },
    tone: { values: ["primary", "neutral"] }
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
    /** Optional call-to-action label. */
    actionLabel?: string;
    /** Optional call-to-action destination. */
    actionTo?: string;
    /** Hero accent color. */
    tone?: "primary" | "neutral";
    /** Hero image. */
    image?: {
      /** Image source URL. */
      src: string;
      /** Alternative text for the image. */
      alt?: string;
    };
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
    <UButton
      v-if="props.actionLabel && props.actionTo"
      class="mt-8"
      :label="props.actionLabel"
      :to="props.actionTo"
      :color="props.tone"
    />
  </section>
</template>
