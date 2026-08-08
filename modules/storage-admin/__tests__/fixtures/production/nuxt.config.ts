import storageAdminModule from "../../../src/module";

export default defineNuxtConfig({
  compatibilityDate: "2026-08-09",
  modules: [storageAdminModule],
  nitro: {
    storage: {
      cache: { driver: "memory" }
    }
  },
  storageAdmin: {
    enabled: true,
    adminToken: "fixture-admin-token",
    mounts: {
      cache: {
        permissions: ["read", "write", "delete"],
        prefixes: ["pages"]
      }
    }
  }
});
