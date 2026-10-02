import componentMeta from "#nuxt-component-meta/nitro";

export default defineEventHandler(() => ({
  layer: "markdown-renderer",
  components: Object.keys(componentMeta)
}));
