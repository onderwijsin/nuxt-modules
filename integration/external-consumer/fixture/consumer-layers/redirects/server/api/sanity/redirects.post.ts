import { refreshRedirects } from "@onderwijsin/nuxt-redirects/runtime";

export default defineEventHandler(async () => ({ data: await refreshRedirects() }));
