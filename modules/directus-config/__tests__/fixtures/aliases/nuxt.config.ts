import directusConfigModule from "../../../src/module";
import { fileURLToPath } from "node:url";

export default defineNuxtConfig({
  alias: {
    "@onderwijsin/nuxt-directus-config/config": fileURLToPath(
      new URL("../../../src/config/index.ts", import.meta.url)
    ),
    "@onderwijsin/nuxt-directus-config/schema": fileURLToPath(
      new URL("../../../src/schema/index.ts", import.meta.url)
    )
  },
  modules: [directusConfigModule]
});
