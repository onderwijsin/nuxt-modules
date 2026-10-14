import { name as packageName } from "../package.json";

export default defineNuxtConfig({
  extends: ["playground-layer"],
  modules: ["@onderwijsin/nuxt-markdown-documents"],
  appConfig: { packageName },
  markdownDocuments: { enabled: true }
});
