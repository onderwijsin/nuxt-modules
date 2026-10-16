/**
 * Exercises the registered conversion hook with an event-free indexing-style context.
 * @returns The Markdown produced by the registered hooks.
 */
export default defineEventHandler(async () => {
  const context = {
    html: "<h1>Converted HTML</h1>",
    markdown: "# Converted HTML",
    route: "/articles/public",
    title: "HTML title",
    description: "HTML description",
    isPrerender: false
  };
  await useNitroApp().hooks.callHook("ai-ready:page:markdown", context);
  return { markdown: context.markdown };
});
