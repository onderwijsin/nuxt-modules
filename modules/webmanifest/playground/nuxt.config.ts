import { name as packageName } from "../package.json";

export default defineNuxtConfig({
  extends: ["playground-layer"],
  modules: ["@onderwijsin/nuxt-webmanifest"],
  appConfig: { packageName },
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
