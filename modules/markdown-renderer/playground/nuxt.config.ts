import { name as packageName } from "../package.json";

export default defineNuxtConfig({
  extends: ["playground-layer"],
  modules: ["@onderwijsin/nuxt-markdown-renderer", "@nuxt/image"],
  css: ["~/assets/main.css"],
  markdownRenderer: {
    referenceConfig: { linkResolver: "~/utils/resolveReferencePath" },
    relatedItemListConfig: {
      mapItem: "~/utils/mapRelatedItem",
      linkResolver: "~/utils/resolveRelatedItemPath"
    },
    componentSets: {
      demo: [
        "ItemList",
        "MarkdownAnchor",
        "MarkdownButton",
        "MarkdownCallout",
        "MarkdownHero",
        "Reference"
      ]
    },
    videoBaseUrl: "http://localhost:8055"
  },
  appConfig: { packageName },
  // @ts-expect-error not sure why the config prop is not recognized by TypeScript. Need to investigate further.
  image: {
    provider: "directus",
    directus: {
      baseURL: "http://localhost:8055/assets"
    }
  }
});
