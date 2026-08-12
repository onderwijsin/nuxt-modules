import { defineDirectusConfig } from "@onderwijsin/nuxt-directus-config/config";

export default defineDirectusConfig({
  instance: {
    baseUrl: "https://cms.example.test",
    staticToken: "playground-secret-not-for-client"
  },
  client: { commands: ["readItems", "aggregate"] }
});
