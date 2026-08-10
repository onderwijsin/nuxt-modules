import { name as packageName } from "../package.json";

export default defineNuxtConfig({
  extends: ["playground-layer"],
  modules: ["@onderwijsin/nuxt-loops-renderer"],
  css: ["~/assets/main.css"],
  appConfig: { packageName }
  // loopsRenderer: {
  //   applyInlineStyles: false
  // }
});
