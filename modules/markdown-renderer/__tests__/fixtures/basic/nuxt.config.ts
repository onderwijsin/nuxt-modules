import { fileURLToPath } from "node:url";
import MarkdownRendererModule from "../../../src/module";

export default defineNuxtConfig({
  modules: [
    MarkdownRendererModule,
    fileURLToPath(new URL("../../../../webmanifest/src/module.ts", import.meta.url))
  ],
  appConfig: { ui: { prose: { p: { base: "markdown-prose-proof" } } } },
  markdownRenderer: {
    videoBaseUrl: "https://media.example.com/assets/",
    componentSets: { demo: ["MarkdownButton", "MarkdownCallout", "MarkdownHero"] }
  }
});
