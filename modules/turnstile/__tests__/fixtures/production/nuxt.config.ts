import turnstileModule from "../../../src/module";

export default defineNuxtConfig({
  modules: [turnstileModule],
  turnstile: {
    siteKey: "fixture-site-key",
    secretKey: "",
    adminToken: "fixture-admin-token",
    adminHeaderName: "x-fixture-admin"
  }
});
