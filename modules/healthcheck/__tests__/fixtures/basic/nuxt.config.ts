import healthcheckModule from "../../../src/module";

export default defineNuxtConfig({
  compatibilityDate: "2026-08-07",
  modules: [healthcheckModule],
  healthcheck: {
    cache: { enabled: false },
    cloudinary: { enabled: false },
    directus: { enabled: false }
  }
});
