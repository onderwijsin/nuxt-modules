import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  compatibilityDate: "2026-08-07",
  modules: ["@onderwijsin/nuxt-webmanifest"],
  image: {
    provider: "ipx"
  },
  webmanifest: {
    icons: {
      appIcon: "/icon.jpeg"
    }
  },
  site: {
    url: "https://webmanifest.example.com",
    name: "Webmanifest Playground",
    description: "A playground for the Nuxt webmanifest module."
  },
  schemaOrg: {
    identity: {
      type: "Organization",
      name: "Webmanifest Playground Organization",
      alternateName: "Webmanifest Playground",
      description: "The sample organization identity used by the webmanifest playground.",
      url: "https://webmanifest.example.com"
    }
  }
});
