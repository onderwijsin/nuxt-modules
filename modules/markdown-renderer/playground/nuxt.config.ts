import { name as packageName } from "../package.json";

export default defineNuxtConfig({
  extends: ["playground-layer"],
  modules: ["@onderwijsin/nuxt-markdown-renderer"],
  markdownRenderer: {
    componentSets: { demo: ["Button", "Callout"] }
  },
  appConfig: { packageName }
});
