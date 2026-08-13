import { refreshRedirects } from "@onderwijsin/nuxt-redirects/runtime";

export default defineEventHandler(async () => ({
  layer: "redirects",
  data: await refreshRedirects()
}));
