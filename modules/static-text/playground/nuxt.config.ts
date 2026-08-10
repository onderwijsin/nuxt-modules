import { name as packageName } from "../package.json";

export default defineNuxtConfig({
  extends: ["playground-layer"],
  modules: ["@onderwijsin/nuxt-static-text"],
  appConfig: { packageName },
  staticText: {
    content: "assets/ui/content.ts"
  }
});
