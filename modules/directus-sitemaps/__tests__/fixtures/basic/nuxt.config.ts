import directusConfigModule from "../../../../directus-config/src/module";
import directusModule from "../../../../directus/src/module";
import directusSitemapsModule from "../../../src/module";
import { fileURLToPath } from "node:url";

export default defineNuxtConfig({
  alias: {
    "@onderwijsin/nuxt-directus-config/config": fileURLToPath(
      new URL("../../../../directus-config/src/config/index.ts", import.meta.url)
    ),
    "@onderwijsin/nuxt-directus-config/schema": fileURLToPath(
      new URL("../../../../directus-config/src/schema/index.ts", import.meta.url)
    )
  },
  modules: [directusConfigModule, directusModule, directusSitemapsModule, "@nuxtjs/sitemap"]
});
