import staticTextModule from "../../../src/module";

export default defineNuxtConfig({
  modules: [staticTextModule],
  staticText: {
    content: "assets/content.ts"
  }
});
