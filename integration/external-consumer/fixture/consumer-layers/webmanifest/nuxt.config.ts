export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-webmanifest"],
  webmanifest: {
    enabled: true,
    manifest: {
      name: "External consumer validation",
      short_name: "External consumer",
      start_url: "/"
    }
  }
});
