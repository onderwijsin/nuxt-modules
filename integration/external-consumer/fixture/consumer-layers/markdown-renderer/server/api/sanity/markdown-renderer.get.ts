import componentMeta from "#nuxt-component-meta";

export default defineEventHandler(() => ({
  layer: "markdown-renderer",
  components: Object.keys(componentMeta)
}));
