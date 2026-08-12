import { defineDirectusConfig } from "@onderwijsin/nuxt-directus-config/config";

export default defineDirectusConfig({
  instance: { baseUrl: "https://directus.invalid" },
  client: { typegen: { enabled: false } },
  sitemaps: {
    static: [{ loc: "/external-about", changefreq: "monthly" }],
    cache: false
  }
});
