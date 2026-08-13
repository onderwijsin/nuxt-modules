import { varlockVitePlugin } from "@varlock/vite-integration";
import { ENV } from "varlock/env";
import { name as packageName } from "../package.json";

export default defineNuxtConfig({
  extends: ["playground-layer"],
  vite: {
    plugins: [varlockVitePlugin({ ssrInjectMode: "auto-load" })]
  },
  modules: ["@onderwijsin/nuxt-directus-config", "@onderwijsin/nuxt-directus-client"],
  appConfig: { packageName },
  runtimeConfig: {
    public: { playgroundPreviewToken: ENV.DIRECTUS_PREVIEW_TOKEN ?? "" }
  },
  turnstile: {
    siteKey: "1x00000000000000000000BB",
    secretKey: "1x0000000000000000000000000000000AA"
  }
});
