import { name as packageName } from "../package.json";

export default defineNuxtConfig({
  extends: ["playground-layer"],
  modules: ["@onderwijsin/nuxt-turnstile"],
  appConfig: { packageName },
  turnstile: { siteKey: "1x00000000000000000000AA", secretKey: "" }
});
