<script setup lang="ts">
import { computed } from "vue";
import type { LoopsLmxElement } from "@onderwijsin/loops-core";
import { getLoopsLmxPixels } from "@onderwijsin/loops-core";
import { resolveSafeLoopsLmxUrl } from "@onderwijsin/loops-core";
import type { LoopsLmxVariables } from "@onderwijsin/loops-core";
import type { LoopsRendererConfig } from "../../../../types";
import { applyStyles } from "../../../../utils/applyStyles";

const props = defineProps<{
  node: LoopsLmxElement;
  variables: LoopsLmxVariables;
  config: LoopsRendererConfig;
}>();

type RenderableIcon = { name: string; href: string | null };

/**
 * Normalizes each LMX icon once before rendering.
 *
 * This keeps the template declarative and ensures unsupported icon names or unsafe destinations
 * simply disappear instead of being repeatedly resolved during every render pass.
 */
const icons = computed<RenderableIcon[]>(() =>
  (props.node.name === "Icon" ? [props.node] : props.node.children).flatMap((node) => {
    if (node.type !== "element" || node.name !== "Icon") return [];

    const name = getIconName(node.attributes.name);
    return name
      ? [{ name, href: resolveSafeLoopsLmxUrl(node.attributes.href, props.variables, "link") }]
      : [];
  })
);
const style = computed(() => ({
  display: "flex",
  gap: `${getLoopsLmxPixels(props.node.attributes.gap, 0, 200) ?? 16}px`,
  fontSize: `${getLoopsLmxPixels(props.node.attributes.size, 18, 48) ?? 24}px`,
  ...applyStyles(props.node.attributes, props.config.applyInlineStyles !== false)
}));

/** Converts the supported Loops Font Awesome names to the locally bundled Simple Icons collection. */
function getIconName(name: string | undefined): string | null {
  return (
    {
      "square-facebook": "i-simple-icons-facebook",
      facebook: "i-simple-icons-facebook",
      "square-x-twitter": "i-simple-icons-x",
      twitter: "i-simple-icons-x",
      linkedin: "i-simple-icons-linkedin",
      instagram: "i-simple-icons-instagram",
      youtube: "i-simple-icons-youtube",
      github: "i-simple-icons-github",
      discord: "i-simple-icons-discord",
      envelope: "i-lucide-mail",
      link: "i-lucide-link",
      phone: "i-lucide-phone"
    }[name ?? ""] ?? null
  );
}
</script>

<template>
  <div v-if="icons.length" :style="style">
    <template v-for="(icon, index) in icons" :key="index">
      <a v-if="icon.href" :href="icon.href">
        <UIcon :name="icon.name" />
      </a>
      <UIcon v-else :name="icon.name" />
    </template>
  </div>
</template>
