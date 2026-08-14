import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { defineNuxtModule } from "@nuxt/kit";

/** Exposes the routes collected by Nitro's prerender hook to the playground UI. */
export default defineNuxtModule({
  meta: { name: "playground-prerender-route-manifest" },
  setup(_, nuxt) {
    const manifestPath = join(nuxt.options.buildDir, "prerender-routes.json");
    nuxt.options.runtimeConfig.directusPrerenderManifestPath = manifestPath;

    nuxt.hook("prerender:routes", async (context) => {
      await mkdir(nuxt.options.buildDir, { recursive: true });
      await writeFile(manifestPath, JSON.stringify([...context.routes]), "utf8");
    });
  }
});
